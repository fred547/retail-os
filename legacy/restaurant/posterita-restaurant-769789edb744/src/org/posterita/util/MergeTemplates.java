package org.posterita.util;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileFilter;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.Arrays;

public class MergeTemplates {

	public static void main(String[] args) throws IOException {
		
		System.out.println("Merging templates ...");
		
		String dir = System.getProperty("user.dir") + "/web";
		
		String[][] mappings = {
				{"/html/popups", "/html/1.0/templates/popup-tpls.html"},
				{"/html/popups/order-screen", "/html/1.0/templates/order-screen-popup-tpls.html"},
				{"/html/popups/view-order", "/html/1.0/templates/view-order-popup-tpls.html"}
		};
		
		
		for(String[] mapping : mappings) {
			
			System.out.println("Template - > " + mapping[1]);
			
			File src = new File( dir + mapping[0]);
			
			File[] files = src.listFiles(new FileFilter() {
				
				@Override
				public boolean accept(File pathname) {
					// TODO Auto-generated method stub
					return pathname.isFile() && pathname.getName().endsWith(".html");
				}
			});
			
			Arrays.sort(files, (a, b) -> a.getName().compareTo(b.getName()));
			
			StringBuffer sb = new StringBuffer();
			String line = null;
			BufferedReader reader = null;
			String name = null;
			
			for(File f : files) {
				
				name = f.getName();
				
				System.out.println(name);
				
				sb.append("<script type=\"text/ng-template\" id=\"" + mapping[0] + "/" + name + "\">");
				sb.append("\n");
				
				reader = new BufferedReader(new FileReader(f));
				
				while( (line = reader.readLine()) != null ) {
					
					sb.append(line);
					sb.append("\n");
				}
				
				sb.append("</script>");
				sb.append("\n");
				sb.append("\n");
				
			}
			
			BufferedWriter writer = new BufferedWriter(new FileWriter(dir + mapping[1]));
			writer.write(sb.toString());
			writer.flush();
			writer.close();
						
		}
		
		

	}

}
