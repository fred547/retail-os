package org.posterita.util;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class EmailValidator {

	final static String regex = "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$";
	
	public static boolean isValidEmail(String email) {
		
		Pattern pattern = Pattern.compile(regex);
		Matcher matcher = pattern.matcher(email);
		
		return matcher.matches();
	}
}
