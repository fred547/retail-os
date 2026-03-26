using System.IO;
using System;
using Microsoft.Win32;
using System.Diagnostics;

class Program
{
    static void Main()
    {
        Console.WriteLine("Detecting installed JVMs ...");
        
        string installPath = GetJavaInstallationPath();
        
        string filePath = System.IO.Path.Combine(installPath, "bin\\Java.exe");
        if (System.IO.File.Exists(filePath))
        {
            Console.WriteLine("Using the following jvm - " + installPath);
            
            do
            {
                if (System.IO.File.Exists(filePath))
                {
                    Console.WriteLine("Restarting posterita ...");
                }
                else
                {
                    Console.WriteLine("Starting posterita ...");
                }
                
                LaunchCommandLineApp(filePath);
            }
            while(System.IO.File.Exists("restart.flag"));
            
        }
        else
        {
            string message = "Java Configuration Error. Failed to detect valid java installation. Path : " + filePath + " does not exist!";
            Console.WriteLine(message);
        }
    }
    
    static void LaunchCommandLineApp(string java)
    {
    	// Use ProcessStartInfo class
    	ProcessStartInfo startInfo = new ProcessStartInfo();
    	startInfo.CreateNoWindow = false;
    	startInfo.UseShellExecute = false;
    	startInfo.FileName = java;
    	startInfo.WindowStyle = ProcessWindowStyle.Hidden;
    	startInfo.Arguments = "-cp \"lib/*\" org.posterita.client.Posterita";
    
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
    
    static string GetJavaInstallationPath()
    {
      string environmentPath = Environment.GetEnvironmentVariable("JAVA_HOME");
      if (!string.IsNullOrEmpty(environmentPath))
      {
        return environmentPath;
      }
    
      const string JAVA_KEY = "SOFTWARE\\JavaSoft\\Java Runtime Environment\\";
    
      var localKey = RegistryKey.OpenBaseKey(Microsoft.Win32.RegistryHive.LocalMachine, RegistryView.Registry32);
      using (var rk = localKey.OpenSubKey(JAVA_KEY))
      {
        if (rk != null)
        {
          string currentVersion = rk.GetValue("CurrentVersion").ToString();
          using (var key = rk.OpenSubKey(currentVersion))
          {
            return key.GetValue("JavaHome").ToString();
          }
        }
      }
    
      localKey = RegistryKey.OpenBaseKey(Microsoft.Win32.RegistryHive.LocalMachine, RegistryView.Registry64);
      using (var rk = localKey.OpenSubKey(JAVA_KEY))
      {
        if (rk != null)
        {
          string currentVersion = rk.GetValue("CurrentVersion").ToString();
          using (var key = rk.OpenSubKey(currentVersion))
          {
            return key.GetValue("JavaHome").ToString();
          }
        }
      }
    
      return null;
    }
}

