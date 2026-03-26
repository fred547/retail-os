$(() => {
    document.getElementById('txtFileUpload').addEventListener('change', upload, false);

    function upload(evt) {

        var data = null;
        var file = evt.target.files[0];
        var reader = new FileReader();
        reader.readAsText(file);
        reader.onload = function (event) {
            var csvData = event.target.result;

            var data = Papa.parse(csvData, { header: true, skipEmptyLines: true });

            let records = data.data;

            console.log(records);

            $('#example').DataTable({
                data: data.data,
                columns: [
                    { data: 'Name' },
                    { data: 'Description' },
                    { data: 'Barcode' },
                    { data: 'Price' },
                    { data: 'Qty' }
                ],
            });

        };
        reader.onerror = function () {
            alert('Unable to read ' + file.fileName);
        };

    }
});

