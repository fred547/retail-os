package org.posterita.util;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class Zipper {
	
    public static void zipDirectory(String sourceDirPath, String zipFilePath) throws IOException {
        File sourceDir = new File(sourceDirPath);
        FileOutputStream fos = new FileOutputStream(zipFilePath);
        ZipOutputStream zipOut = new ZipOutputStream(fos);

        zipDir(sourceDir, sourceDir.getName(), zipOut);

        zipOut.close();
        fos.close();
    }

    private static void zipDir(File dir, String relativePath, ZipOutputStream zipOut) throws IOException {
        File[] files = dir.listFiles();

        for (File file : files) {
            if (file.isDirectory()) {
                zipDir(file, relativePath + File.separator + file.getName(), zipOut);
            } else {
                FileInputStream fis = new FileInputStream(file);
                ZipEntry zipEntry = new ZipEntry(relativePath + File.separator + file.getName());
                zipOut.putNextEntry(zipEntry);

                byte[] buffer = new byte[1024];
                int length;
                while ((length = fis.read(buffer)) > 0) {
                    zipOut.write(buffer, 0, length);
                }

                fis.close();
            }
        }
    }
}