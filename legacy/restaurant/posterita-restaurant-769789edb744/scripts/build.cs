using System.IO;
using System.Diagnostics;
using System;


class Program
{
    static void Main()
    {
        Console.WriteLine("Hello, World!");
        LaunchCommandLineApp();
    }
    
    static void LaunchCommandLineApp()
    {
    	// Use ProcessStartInfo class
    	ProcessStartInfo startInfo = new ProcessStartInfo();
    	startInfo.CreateNoWindow = false;
    	startInfo.UseShellExecute = false;
    	startInfo.FileName = "java";
    	startInfo.WindowStyle = ProcessWindowStyle.Hidden;
    	startInfo.Arguments = "-version";
    
    	try
    	{
    	    // Start the process with the info we specified.
    	    // Call WaitForExit and then the using statement will close.
    	    using (Process exeProcess = Process.Start(startInfo))
    	    {
    		    exeProcess.WaitForExit();
    	    }
    	}
    	catch
    	{
    	    // Log error.
    	}
    }
}

