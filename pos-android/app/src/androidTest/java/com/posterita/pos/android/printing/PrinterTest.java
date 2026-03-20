package com.posterita.pos.android.printing;

import android.content.Context;
import android.util.Log;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;

import com.dantsu.escposprinter.EscPosPrinter;
import com.dantsu.escposprinter.connection.tcp.TcpConnection;
import com.posterita.pos.android.Utils.SharedPreferencesUtils;
import com.posterita.pos.android.database.DatabaseSynchronizer;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.io.BufferedOutputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketTimeoutException;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@RunWith(AndroidJUnit4.class)
public class PrinterTest {
    private Context context;

    @Before
    public void setUp() {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

    @Test
    public void testLan(){

        try {
            EscPosPrinter printer = new EscPosPrinter(new TcpConnection("192.168.100.51", 9100, 15), 203, 48f, 32);
            printer
                    .printFormattedText(
                            //"[C]<img>" + PrinterTextParserImg.bitmapToHexadecimalString(printer, getApplicationContext().getResources().getDrawableForDensity(R.drawable.logo, DisplayMetrics.DENSITY_MEDIUM)) + "</img>\n" +
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

    }

    @Test
    public void testReceiptPrinter() throws InterruptedException {

        sendJobToLANPrinter("192.168.100.51", "" +
                "Hello World\n" +
                "This is a test print job\n" +
                "From Android Device\n" +
                "Using LAN Printer\n" );
    }

    private void sendJobToLANPrinter(String hostname, String job) throws InterruptedException {

        ExecutorService executorService = Executors.newSingleThreadExecutor();

        String TAG = "PrinterTest";

        CountDownLatch latch = new CountDownLatch(1);

        executorService.submit(()->{

            int port = 9100;

            try
            {
                Socket soc = new Socket();
                soc.connect(new InetSocketAddress(hostname, port), 1500);
                BufferedOutputStream bos = new BufferedOutputStream(soc.getOutputStream());
                bos.write(job.getBytes());
                bos.flush();
                bos.close();
                soc.close();


            }
            catch(SocketTimeoutException se)
            {
                //callbackContext.error("Connection timeout!");
                Log.e(TAG, "printSMS: " + "Connection timeout!", se);
            }
            catch (IOException e)
            {
                Log.e(TAG, "printSMS", e);

            }
            finally {
                latch.countDown();
            }


        });

        executorService.shutdown();
        latch.await();
    }

}
