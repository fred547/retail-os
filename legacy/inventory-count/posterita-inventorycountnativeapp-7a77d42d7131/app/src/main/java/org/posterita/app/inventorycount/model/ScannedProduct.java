package org.posterita.app.inventorycount.model;

import android.os.Environment;
import android.util.Log;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.LinkedList;

import jxl.Workbook;
import jxl.write.Label;
import jxl.write.Number;
import jxl.write.WritableCellFormat;
import jxl.write.WritableFont;
import jxl.write.WritableSheet;
import jxl.write.WritableWorkbook;

public class ScannedProduct {

    private static LinkedList<ProductInfo> list = new LinkedList<>();

    /*
    static {

        int location = 0, barcode = 0, qty = 0;

        for(int i=0; i< 100; i++){

            if(i%10 == 0){
                location = 100000 + (int)(Math.random() * 100000);
            }

            barcode = 1000000 + (int)(Math.random() * 1000000);
            qty =  1 + (int)((Math.random() * 100));

            list.add(new ProductInfo(Integer.toString(location), Integer.toString(barcode), qty));

        }

    }
    */

    public static void addInfo(ProductInfo info){
        list.add(info);
    }

    public static LinkedList<ProductInfo> getList(){
        return list;
    }

    public static void clearAll(){
        list.clear();
    }

    public static void saveInventoryCountFile() throws Exception {

        File documentDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);

        File dir = new File(documentDir, "InventoryCount");

        Log.i("Info", "Dir -> " + dir.getAbsolutePath());

        if(!dir.exists()){
            dir.mkdirs();
        }

        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd_HHmm");
        String dateStr = sdf.format(new Date(System.currentTimeMillis()));


        File count = new File(dir, dateStr + ".csv");
        try
        {
            BufferedWriter bw = new BufferedWriter(new FileWriter(count));

            bw.write("\"Location\",\"Barcode\",\"Qty\"");

            for(ProductInfo info : ScannedProduct.getList()){

                bw.write(String.format("%n\"%s\",\"%s\",\"%f\"", info.getLocation(), info.getBarcode(), info.getQty()));
            }


            bw.flush();
            bw.close();
        }
        catch(Exception e){
            throw e;
        }

        count = new File(dir, sdf.format(new Date(System.currentTimeMillis())) + ".xls");

        try
        {
            WritableWorkbook workbook = Workbook.createWorkbook(count);
            WritableSheet sheet = workbook.createSheet("Sheet 1", 0);

            WritableFont font1 = new WritableFont(WritableFont.ARIAL, 10, WritableFont.BOLD);
            WritableFont font2 = new WritableFont(WritableFont.ARIAL, 10, WritableFont.NO_BOLD);

            WritableCellFormat headerFormat = new WritableCellFormat();
            headerFormat.setFont(font1);
            headerFormat.setWrap(false);

            WritableCellFormat cellFormat = new WritableCellFormat();
            cellFormat.setFont(font2);
            cellFormat.setWrap(false);

            int row = 0;

            sheet.addCell(new Label(0, row, "Location", headerFormat));
            sheet.addCell(new Label(1, row, "Barcode", headerFormat));
            sheet.addCell(new Label(2, row, "Qty", headerFormat));

            for(ProductInfo info : ScannedProduct.getList()){

                row ++;

                sheet.addCell(new Label(0, row, info.getLocation(), cellFormat));
                sheet.addCell(new Label(1, row, info.getBarcode(), cellFormat));
                sheet.addCell(new Number(2, row, info.getQty(), cellFormat));
            }

            workbook.write();
            workbook.close();
        }
        catch(Exception e1){
            throw e1;
        }
    }
}
