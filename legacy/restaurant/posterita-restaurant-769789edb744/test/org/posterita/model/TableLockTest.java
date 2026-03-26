package org.posterita.model;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class TableLockTest {
	
	@BeforeEach
	public void beforeAll() {		
		TableLock.clear();		
		TableLock.lockTable("TableA", "A");
		TableLock.lockTable("TableB", "B");
	}
	
	@Test
	public void clear() {		
		TableLock.clear();		
		assertTrue(TableLock.noOfTablesLocked() == 0);		
	}
	
	@Test
	public void lockTable() {
		
		String tableId = "TableC";
		String identifier = "C";
		
		TableLock.lockTable(tableId, identifier);
		
		boolean isLocked = TableLock.isTableLocked(tableId);
		
		assertTrue(isLocked);
	}
	
	@Test
	public void unLockTable() {
		
		String tableId = "TableA";
		String identifier = "A";		
		
		boolean unLocked = TableLock.unLockTable(tableId, identifier);
		
		assertTrue(unLocked);
	}
	
	@Test
	public void lockAlreadyLockedTableByOwner() {
		
		String tableId = "TableA";
		String identifier = "A";
		
		boolean locked = TableLock.lockTable(tableId, identifier);
		
		assertTrue(locked);
	}
	
	@Test
	public void lockAlreadyLockedTableNotByOwner() {
		
		String tableId = "TableA";
		String identifier = "B"; // not owner of lock
		
		boolean locked = TableLock.lockTable(tableId, identifier);
		
		assertFalse(locked);
	}
	
	@Test
	public void unlockTableNotByOwner() {
		
		String tableId = "TableA";
		String identifier = "B"; // not owner of lock
		
		boolean unLocked = TableLock.unLockTable(tableId, identifier);
		
		assertFalse(unLocked);
	}
	
	@Test
	public void isTableLocked() {
		
		String tableId = "TableA";
		
		boolean isLocked = TableLock.isTableLocked(tableId);
		
		assertTrue(isLocked);
	}
	
	@Test
	public void isTableUnLocked() {
		
		String tableId = "TableZ";
		
		boolean isLocked = TableLock.isTableLocked(tableId);
		
		assertFalse(isLocked);
	}
	
	@Test
	public void releaseLock() {
		
		String tableId = "TableB";
		String identifier = "B";
		
		TableLock.releaseLock(identifier);
		
		boolean isLocked = TableLock.isTableLocked(tableId);
		
		assertFalse(isLocked);
	}
	
	@Test
	public void forceUnlockTable() {
		
		String tableId = "TableB";
		TableLock.forceUnLockTable(tableId);
		
		boolean isLocked = TableLock.isTableLocked(tableId);
		
		assertFalse(isLocked);
		
	}

}
