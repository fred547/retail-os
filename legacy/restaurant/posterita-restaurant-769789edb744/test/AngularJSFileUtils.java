import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.TreeSet;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class AngularJSFileUtils {

	public static void main(String[] args) throws IOException {
		
		//split("web/html/1.0/lib/services.js", "web/html/1.0/services");
		split("web/html/1.0/lib/table-controller.js", "web/html/1.0/controllers");
		
		//listScripts("web/html/1.0/controllers");
	}
	
	/**
	 * 
	 * @param filePath - web/html/1.0/lib/services.js
	 * @param destDir - web/html/1.0/services
	 * @param linkPrefix - services
	 * @throws IOException
	 */
	private static void split(String filePath, String destDir) throws IOException {
		
		String linkPrefix = destDir.replaceAll("web/html/1.0/", "");
		
		TreeSet<String> scripts = new TreeSet<>();
		
		FileReader reader = new FileReader(new File(filePath));
		BufferedReader b = new BufferedReader(reader);
		
		String line = null;
		StringBuffer sb = new StringBuffer();
		String fileName = null;
		
		while((line = b.readLine()) != null) {
			
			if(line.startsWith("angular.module")) {
				
				if(sb.length() > 0) {
					//write file 					
					writeFile( destDir + "/" + fileName, sb.toString());
				}
				
				fileName = line.substring(31, line.indexOf(",", 31) - 1);
				fileName = formatName(fileName) + ".js";
				sb = new StringBuffer(line).append("\n");
				
				scripts.add(String.format("<script type=\"text/javascript\" src=\"%s/%s\"></script>", linkPrefix, fileName));
			}
			else
			{
				sb.append(line).append("\n");
			}
		}
		
		writeFile( destDir + "/" + fileName, sb.toString());
		
		b.close();
		
		System.out.printf("==============================%n\tGenerated %d files%n==============================%n", scripts.size());
		scripts.stream().forEach(System.out::println);
	}
	
	private static String formatName(String name) {
		
		StringBuffer sb = new StringBuffer();
		
		Pattern p = Pattern.compile("([A-Z][a-z]+)");
		
		Matcher m = p.matcher(name);
		
		while(m.find()) {
			if(sb.length() > 0) sb.append("-");
			sb.append(m.group().toLowerCase());
		}
		
		return sb.toString();
	}
	
	private static void writeFile(String name, String content) throws IOException {
		
		System.out.println("Writing file -> " + name);
		
		BufferedWriter writer = new BufferedWriter(new FileWriter(name));
		writer.write(content.trim());
		writer.close();
	}
	
	private static void listScripts(String dir) {
		
		String linkPrefix = dir.replaceAll("web/html/1.0/", "");
		
		File f = new File(dir);
		
		List<String> scripts = Arrays.stream(f.list()).filter(x -> x.endsWith(".js")).sorted().collect(Collectors.toList());
		
		System.out.printf("==============================%n\tFound %d files%n==============================%n", scripts.size());
		scripts.stream().forEach(x -> System.out.printf("<script type=\"text/javascript\" src=\"%s/%s\"></script>%n", linkPrefix, x));
	}

}
