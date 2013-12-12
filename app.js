if(process.env.NODETIME_ACCOUNT_KEY) {
  require('nodetime').profile({
    accountKey: process.env.NODETIME_ACCOUNT_KEY,
    appName: 'Rudder' // optional
  });
}
var cluster = require('cluster');
// Code to run if we're in the master process
if (cluster.isMaster) {
  
  // Count the machine's CPUs
  var cpuCount = require('os').cpus().length;

  // Create a worker for each CPU
  for (var i = 0; i < cpuCount; i += 1) {
    cluster.fork();
  }
  
  // Listen for dying workers
  cluster.on('exit', function (worker) {
    // Replace the dead worker, we're not sentimental
    console.log('Worker ' + worker.id + ' died :(');
    cluster.fork();
  });

// Code to run if we're in a worker process
} else {
  var express = require('express');
  var app = express();
  var fs = require('fs');
  var http = require('http');

  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());

  app.post('/segmentio/:program', function(request,response) {
    console.log(request.params)
    console.log(request.body)
    var params = '', i = 0;
    for(var key in request.body) {
      var val = request.body[key]
      if (i == 0) {
        params += (key + '=' + val);
      } else {
        params += ('&' + key + '=' + val);
      }
      i++;
    }
    console.log(params);
    fs.readFile('config/redirect_uris', 'utf8', function(err, data) {
      var uris = data.split(/[,\s]/);
      for (var i = uris.length - 1; i >= 0; i--){
        var uri = uris[i];
        var options = {
          host: uri,
          path: request.params.program,
          method: 'POST',
          port: 80,
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'content-length': params.length
          }
        }
        var postRequest = http.request(options, function(postResponse) {
          var str = '';
          postResponse.on('data', function(chunk){
            str += chunk;
          });
          
          postResponse.on('end', function(err){
            console.log(str);
            var jsonResult = JSON.parse(str);
            console.log('Return code: ' + jsonResult.rc);
          })
          
          postResponse.on('error', function(err){ 
            console.log('errrorororororo!')
          });
        })
        postRequest.write(params);
        postRequest.end();
      };
      response.send(uris)
    })
    
  });

  var port = process.env.PORT || 5000;
  app.listen(port);
  console.log('Listening on port ' + port);
}