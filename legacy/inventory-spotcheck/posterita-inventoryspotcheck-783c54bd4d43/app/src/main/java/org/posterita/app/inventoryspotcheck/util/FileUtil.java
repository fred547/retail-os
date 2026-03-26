package org.posterita.app.inventoryspotcheck.util;

import android.content.Context;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

public class FileUtil {

    public static final void saveFile(Context context, String filename, String content) throws IOException {

        BufferedOutputStream bos = new BufferedOutputStream(context.openFileOutput(filename, Context.MODE_PRIVATE));
        bos.write(content.getBytes());
        bos.close();

    }

    public static final String readFile(Context context, String filename) throws IOException {

        StringBuffer sb = new StringBuffer();

        BufferedReader reader = new BufferedReader(new InputStreamReader(context.openFileInput(filename)));
        String line;

        while((line = reader.readLine()) != null){
            sb.append(line);
        }

        return sb.toString();

    }

    public static final void deleteFile(Context context, String filename) {
        context.deleteFile(filename);
    }
}
