package org.posterita.model;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.Map.Entry;

import org.apache.log4j.Logger;

public class TableLock {
	
	private static Map<String, String> locks = Collections.synchronizedMap(new HashMap<String, String>());
	
	private static Logger log = Logger.getLogger(TableLock.class);
	
	public static boolean lockTable(String tableId, String identifier) {
		
		log.info(String.format("%s trying to lock table:%s", identifier, tableId));
		
		synchronized (locks) {
			
			if(locks.containsKey(identifier)) {
				locks.remove(identifier);				
			}
			
			if(locks.containsValue(tableId)){
				
				log.info(String.format("%s failed to lock table:%s. Table is currently locked!", identifier, tableId));
				return false;
			}
			
			log.info(String.format("%s locked table:%s successfully.", identifier, tableId));
			locks.put(identifier, tableId);
			
			return true;
		}
	}
	
	public static boolean unLockTable(String tableId, String identifier) {
		
		log.info(String.format("%s trying to unlock table:%s", identifier, tableId));
		
		synchronized (locks) {
			
			if(!locks.containsValue(tableId)) {
				log.info(String.format("%s unlocked table:%s successfully. Table was not locked!", identifier, tableId));
				return true;
			}
			
			String tableOwned = locks.get(identifier);
			
			if(tableOwned != null && tableOwned.equals(tableId)) {
				log.info(String.format("%s unlocked table:%s successfully.", identifier, tableId));
				locks.remove(identifier);
				return true;
			}
			
			log.info(String.format("%s failed to lock table:%s. Table is currently locked!", identifier, tableId));
			
			return false;
		}
		
	}
	
	public static boolean forceUnLockTable(String tableId) {
		
		log.info(String.format("Trying to force unlock table:%s", tableId));
		
		synchronized (locks) {
			
			if(!locks.containsValue(tableId)) {
				log.info(String.format("Unlocked table:%s successfully. Table was not locked!", tableId));
				return true;
			}
			
			for(Entry<String, String> entry : locks.entrySet()) {
				
				if(entry.getValue().equals(tableId)) {
					locks.remove(entry.getKey());
					return true;
				}
			}
			
			return false;
		}
		
	}
	
	public static boolean releaseLock(String identifier) {
		
		if(identifier == null) return true;
		
		log.info(String.format("%s releasing all locks", identifier));
		
		synchronized (locks) {
			locks.remove(identifier);
			return true;
		}
	}
	
	public static boolean isTableLocked(String tableId) {
		synchronized (locks) {
			return locks.containsValue(tableId);
		}
	}
	
	public static int noOfTablesLocked() {
		synchronized (locks) {
			return locks.size();
		}
	}
	
	public static void clear() {
		
		synchronized (locks) {
			locks.clear();
		}
	}

}
