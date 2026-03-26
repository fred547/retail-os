const { contextBridge, ipcRenderer } = require('electron');
const printer = require('node-printer');

contextBridge.exposeInMainWorld('PosteritaBridge', {

  addJob: function(printerName, printData){

    console.log("printing via electron");
	console.log(printerName, printData);

    printer.printDirect({'data':printData // or simple String: "some text"
      , printer:printerName // printer name, if missing then will print to default printer
      , type: 'RAW' // type: RAW, TEXT, PDF, JPEG, .. depends on platform
      , success:function(jobID){
          console.log("sent to printer with ID: "+jobID);
      }
      , error:function(err){console.log(err);}
    });
  },

  getPrintersAsJSON: function(){
    let printers = printer.getPrinters();
    return JSON.stringify(printers.map(x => x.name));
  }

})
