package org.posterita.app.inventoryspotcheck.util;

import android.util.Log;

import com.squareup.okhttp.HttpUrl;
import com.squareup.okhttp.MediaType;
import com.squareup.okhttp.OkHttpClient;
import com.squareup.okhttp.Request;
import com.squareup.okhttp.RequestBody;
import com.squareup.okhttp.Response;

import org.json.JSONObject;

import java.security.KeyManagementException;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

public class HTTPUtil {

    private static final String TAG = "HTTPUtil";

    private static SSLSocketFactory sslSocketFactory;

    static {
        TrustManager[] trustAllCerts = new TrustManager[]{
                new X509TrustManager() {
                    @Override
                    public void checkClientTrusted(java.security.cert.X509Certificate[] chain, String authType) {
                    }

                    @Override
                    public void checkServerTrusted(java.security.cert.X509Certificate[] chain, String authType) {
                    }

                    @Override
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() {
                        return new java.security.cert.X509Certificate[]{};
                    }
                }
        };

        try {

            SSLContext sslContext = SSLContext.getInstance("SSL");
            sslContext.init(null, trustAllCerts, new java.security.SecureRandom());
            sslSocketFactory = sslContext.getSocketFactory();

        } catch (Exception e) {
            throw new RuntimeException(e);
        }

    }


    public static JSONObject getResponseAsJson(String path) throws Exception {

        Log.d(TAG, path);

        OkHttpClient client = new OkHttpClient();
        client.setSslSocketFactory(sslSocketFactory);

        //add parameters
        HttpUrl.Builder urlBuilder = HttpUrl.parse(path).newBuilder();
        //urlBuilder.addQueryParameter("query", "stack-overflow");


        String url = urlBuilder.build().toString();

        //build the request
        Request request = new Request.Builder().url(url).build();

        //execute
        Response response = client.newCall(request).execute();

        String s = response.body().string();

        JSONObject json = new JSONObject(s);

        Log.d(TAG, json.toString(4));

        return json;

    }

    public static JSONObject getPostResponseAsJson(String path, String jsonToPost) throws Exception {

        RequestBody body = RequestBody.create(
                MediaType.parse("application/json"), jsonToPost);

        Request request = new Request.Builder()
                .url(path)
                .post(body)
                .build();

        Log.d(TAG, path);
        Log.d(TAG, jsonToPost);

        OkHttpClient client = new OkHttpClient();
        client.setSslSocketFactory(sslSocketFactory);

        //execute
        Response response = client.newCall(request).execute();

        String s = response.body().string();

        JSONObject json = new JSONObject(s);

        Log.d(TAG, json.toString(4));

        return json;

    }
}
