package com.posterita.pos.android;

import static org.junit.Assert.assertEquals;

import android.content.Context;
import android.util.DisplayMetrics;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.dantsu.escposprinter.EscPosPrinter;
import com.dantsu.escposprinter.connection.tcp.TcpConnection;
import com.dantsu.escposprinter.textparser.PrinterTextParserImg;
import com.posterita.pos.android.database.AppDatabase;
import com.posterita.pos.android.database.entities.Sequence;

import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.CountDownLatch;

/**
 * Instrumented test, which will execute on an Android device.
 *
 * @see <a href="http://d.android.com/tools/testing">Testing documentation</a>
 */
@RunWith(AndroidJUnit4.class)
public class ExampleInstrumentedTest {
    @Test
    public void useAppContext() {
        // Context of the app under test.
        Context appContext = InstrumentationRegistry.getInstrumentation().getTargetContext();
        assertEquals("com.posterita.pos.android", appContext.getPackageName());
    }

    @Test
    public void testSequence() {

        AppDatabase database = AppDatabase.getInstance(InstrumentationRegistry.getInstrumentation().getTargetContext());
        // Fetch the sequence for order_document_no
        Sequence sequence = database.sequenceDao().getSequenceByNameForTerminal("order_document_no", 100);

        if (sequence == null) {
            // Initialize sequence if it doesn't exist
            sequence = new Sequence("order_document_no", 200, 100, "T1");
        }

        // Generate the document number
        String documentNo = generateDocumentNo(sequence);
        assertEquals("T1000000201", documentNo);

        if(sequence.sequence_id == 0){
            database.sequenceDao().insertSequence(sequence);
        }
        else {
            database.sequenceDao().updateSequence(sequence);
        }

        sequence = database.sequenceDao().getSequenceByName("order_document_no");

        documentNo = generateDocumentNo(sequence);
        assertEquals("T1000000202", documentNo);




    }

    private String generateDocumentNo(Sequence sequence) {
        // Increment the sequence number
        sequence.setSequenceNo(sequence.getSequenceNo() + 1);
        // Generate the new document number
        String documentNo = sequence.getPrefix() + String.format("%09d", sequence.getSequenceNo());

        return documentNo;
    }

    @Test
    public void testPrinter(){

        CountDownLatch latch = new CountDownLatch(1);

        new Thread(new Runnable() {
            public void run() {
                try {
                    EscPosPrinter printer = new EscPosPrinter(new TcpConnection("192.168.100.51", 9100, 15), 203, 48f, 32);
                    printer
                            .printFormattedText(
                                    "[C]<img>" + PrinterTextParserImg.bitmapToHexadecimalString(printer, InstrumentationRegistry.getInstrumentation().getTargetContext().getResources().getDrawableForDensity(R.drawable.logo, DisplayMetrics.DENSITY_MEDIUM)) + "</img>\n" +
                                            "[L]\n" +
                                            "[C]<u><font size='big'>ORDER N°045</font></u>\n" +
                                            "[L]\n" +
                                            "[C]================================\n" +
                                            "[L]\n" +
                                            "[L]<b>BEAUTIFUL SHIRT</b>[R]9.99e\n" +
                                            "[L]  + Size : S\n" +
                                            "[L]\n" +
                                            "[L]<b>AWESOME HAT</b>[R]24.99e\n" +
                                            "[L]  + Size : 57/58\n" +
                                            "[L]\n" +
                                            "[C]--------------------------------\n" +
                                            "[R]TOTAL PRICE :[R]34.98e\n" +
                                            "[R]TAX :[R]4.23e\n" +
                                            "[L]\n" +
                                            "[C]================================\n" +
                                            "[L]\n" +
                                            "[L]<font size='tall'>Customer :</font>\n" +
                                            "[L]Raymond DUPONT\n" +
                                            "[L]5 rue des girafes\n" +
                                            "[L]31547 PERPETES\n" +
                                            "[L]Tel : +33801201456\n" +
                                            "[L]\n" +
                                            "[C]<barcode type='ean13' height='10'>831254784551</barcode>\n" +
                                            "[C]<qrcode size='20'>https://dantsu.com/</qrcode>"
                            );
                } catch (Exception e) {
                    e.printStackTrace();
                }
                finally {
                    latch.countDown();
                }
            }
        }).start();

        try {
            latch.await();
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}
