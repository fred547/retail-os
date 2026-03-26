package org.posterita.util;

import java.util.UUID;

public class UUIDGenerator 
{
	public static String getId()
	{
		UUID id = UUID.randomUUID();
		return id.toString();
	}

}
