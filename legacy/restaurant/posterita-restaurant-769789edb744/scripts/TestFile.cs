using System;
using System.IO;

class TestFile
{
    public void test()
    {
    	// See if this file exists in the SAME DIRECTORY.
    	if (File.Exists("TextFile1.txt"))
    	{
    	    Console.WriteLine("The file exists.");
    	}
    	// See if this file exists in the C:\ directory. [Note the @]
    	if (File.Exists(@"C:\tidy.exe"))
    	{
    	    Console.WriteLine("The file exists.");
    	}
    	// See if this file exists in the C:\ directory [Note the '\\' part]
    	bool exists = File.Exists("C:\\lost.txt");
    	Console.WriteLine(exists);
    }
}
