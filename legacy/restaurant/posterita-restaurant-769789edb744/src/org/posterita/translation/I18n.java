package org.posterita.translation;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class I18n {
	
	private static String language = "en";	
	private static Properties prop = new Properties();
	private static boolean initialised = false;
	
	public static void init(String lang)
	{
		if(lang != null){
			language = lang;
		}
		
		String filename = "org/posterita/translation/message_" + language + ".properties";
		InputStream is = ClassLoader.getSystemClassLoader().getResourceAsStream(filename);
		
		if(is == null){
			System.out.println("Failed to load language --> " + language);
			filename = "org/posterita/translation/message_en.properties";
			is = ClassLoader.getSystemClassLoader().getResourceAsStream(filename);
		}
		
		try {
			prop.load(is);
		} catch (IOException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
		
		initialised = true;
	}
	
	public static String t(String key, String... params)
	{
		if(!initialised)
		{
			init(null);
		}
		
		String value = prop.getProperty(key);
		
		if(value == null) return key;
		
		if(params != null && params.length > 0){
			 Pattern pattern = Pattern.compile("\\{\\d+\\}");
			 Matcher matcher = pattern.matcher(value);
			 
			 String group = null;
			 
			 while (matcher.find()) {
				 
				 group = matcher.group();
				 
				 String[] s = group.split("\\{|\\}");
			      
			     value = value.replaceFirst("\\{\\d+\\}", params[Integer.parseInt(s[1])]);
			 }
			 
		}
		
		return value;
	}

	public static void main(String[] args) throws IOException 
	{
		System.out.println(I18n.t("xxxx","Praveen"));

	}
	
	public static String getLanguage()
	{
		return language;
	}

}
