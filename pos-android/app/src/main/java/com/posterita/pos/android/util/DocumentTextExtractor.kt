package com.posterita.pos.android.util

import android.content.ContentResolver
import android.net.Uri
import android.util.Log
import org.xmlpull.v1.XmlPullParser
import org.xmlpull.v1.XmlPullParserFactory
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.util.zip.ZipInputStream

/**
 * Extracts text content from various document formats without external libraries.
 * Supports: CSV, TXT, DOCX (Office Open XML), XLSX (Office Open XML).
 */
object DocumentTextExtractor {

    private const val TAG = "DocumentTextExtractor"

    /**
     * Determines the document type from MIME type string.
     */
    enum class DocType {
        IMAGE, PDF, CSV, PLAIN_TEXT, DOCX, XLSX, UNKNOWN
    }

    fun classifyMimeType(mimeType: String?): DocType = when {
        mimeType == null -> DocType.UNKNOWN
        mimeType.startsWith("image/") -> DocType.IMAGE
        mimeType == "application/pdf" -> DocType.PDF
        mimeType == "text/csv" || mimeType == "text/comma-separated-values" -> DocType.CSV
        mimeType.startsWith("text/") -> DocType.PLAIN_TEXT
        mimeType == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" -> DocType.DOCX
        mimeType == "application/msword" -> DocType.DOCX // old .doc — best effort
        mimeType == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" -> DocType.XLSX
        mimeType == "application/vnd.ms-excel" -> DocType.XLSX // old .xls — best effort
        else -> DocType.UNKNOWN
    }

    /**
     * Reads a plain text or CSV file as a string.
     */
    fun readTextContent(contentResolver: ContentResolver, uri: Uri): String? {
        return try {
            contentResolver.openInputStream(uri)?.use { inputStream ->
                BufferedReader(InputStreamReader(inputStream)).readText()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read text file", e)
            null
        }
    }

    /**
     * Reads raw bytes from a URI (for PDF pass-through to Claude).
     */
    fun readBytes(contentResolver: ContentResolver, uri: Uri): ByteArray? {
        return try {
            contentResolver.openInputStream(uri)?.use { it.readBytes() }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to read bytes", e)
            null
        }
    }

    /**
     * Extracts text from a DOCX file by parsing word/document.xml inside the ZIP.
     */
    fun extractDocxText(contentResolver: ContentResolver, uri: Uri): String? {
        return try {
            contentResolver.openInputStream(uri)?.use { inputStream ->
                extractDocxTextFromStream(inputStream)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract DOCX text", e)
            null
        }
    }

    private fun extractDocxTextFromStream(inputStream: InputStream): String {
        val sb = StringBuilder()
        val zip = ZipInputStream(inputStream)
        var entry = zip.nextEntry
        while (entry != null) {
            if (entry.name == "word/document.xml") {
                val factory = XmlPullParserFactory.newInstance()
                val parser = factory.newPullParser()
                parser.setInput(zip, "UTF-8")

                var inParagraph = false
                while (parser.next() != XmlPullParser.END_DOCUMENT) {
                    when (parser.eventType) {
                        XmlPullParser.START_TAG -> {
                            if (parser.name == "p") inParagraph = true
                        }
                        XmlPullParser.TEXT -> {
                            if (inParagraph) sb.append(parser.text)
                        }
                        XmlPullParser.END_TAG -> {
                            if (parser.name == "p") {
                                sb.append("\n")
                                inParagraph = false
                            }
                        }
                    }
                }
                break
            }
            entry = zip.nextEntry
        }
        zip.close()
        return sb.toString().trim()
    }

    /**
     * Extracts text from an XLSX file by parsing shared strings and sheet data.
     */
    fun extractXlsxText(contentResolver: ContentResolver, uri: Uri): String? {
        return try {
            contentResolver.openInputStream(uri)?.use { inputStream ->
                extractXlsxTextFromStream(inputStream)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to extract XLSX text", e)
            null
        }
    }

    private fun extractXlsxTextFromStream(inputStream: InputStream): String {
        // XLSX is a ZIP containing:
        // - xl/sharedStrings.xml — shared string table
        // - xl/worksheets/sheet1.xml (etc.) — cell data

        val bytes = inputStream.readBytes()

        // First pass: extract shared strings
        val sharedStrings = mutableListOf<String>()
        extractFromZip(bytes, "xl/sharedStrings.xml") { stream ->
            val factory = XmlPullParserFactory.newInstance()
            val parser = factory.newPullParser()
            parser.setInput(stream, "UTF-8")

            var inT = false
            val current = StringBuilder()
            while (parser.next() != XmlPullParser.END_DOCUMENT) {
                when (parser.eventType) {
                    XmlPullParser.START_TAG -> {
                        if (parser.name == "t") {
                            inT = true
                            current.clear()
                        }
                    }
                    XmlPullParser.TEXT -> {
                        if (inT) current.append(parser.text)
                    }
                    XmlPullParser.END_TAG -> {
                        if (parser.name == "t") {
                            inT = false
                        }
                        if (parser.name == "si") {
                            sharedStrings.add(current.toString())
                        }
                    }
                }
            }
        }

        // Second pass: read sheet data (sheet1 only for simplicity)
        val rows = mutableListOf<List<String>>()
        extractFromZip(bytes, "xl/worksheets/sheet1.xml") { stream ->
            val factory = XmlPullParserFactory.newInstance()
            val parser = factory.newPullParser()
            parser.setInput(stream, "UTF-8")

            var currentRow = mutableListOf<String>()
            var cellType: String? = null
            var inV = false
            val cellValue = StringBuilder()

            while (parser.next() != XmlPullParser.END_DOCUMENT) {
                when (parser.eventType) {
                    XmlPullParser.START_TAG -> {
                        when (parser.name) {
                            "row" -> currentRow = mutableListOf()
                            "c" -> cellType = parser.getAttributeValue(null, "t")
                            "v" -> {
                                inV = true
                                cellValue.clear()
                            }
                        }
                    }
                    XmlPullParser.TEXT -> {
                        if (inV) cellValue.append(parser.text)
                    }
                    XmlPullParser.END_TAG -> {
                        when (parser.name) {
                            "v" -> {
                                inV = false
                                val raw = cellValue.toString()
                                val value = if (cellType == "s") {
                                    val idx = raw.toIntOrNull()
                                    if (idx != null && idx < sharedStrings.size) sharedStrings[idx] else raw
                                } else {
                                    raw
                                }
                                currentRow.add(value)
                            }
                            "row" -> {
                                if (currentRow.isNotEmpty()) rows.add(currentRow)
                            }
                        }
                    }
                }
            }
        }

        // Format as CSV-like text for Claude
        return rows.joinToString("\n") { it.joinToString(", ") }
    }

    private fun extractFromZip(zipBytes: ByteArray, targetEntry: String, processor: (InputStream) -> Unit) {
        val zip = ZipInputStream(zipBytes.inputStream())
        var entry = zip.nextEntry
        while (entry != null) {
            if (entry.name == targetEntry) {
                processor(zip)
                break
            }
            entry = zip.nextEntry
        }
        zip.close()
    }
}
