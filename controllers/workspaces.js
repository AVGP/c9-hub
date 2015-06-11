var fs = require('fs'),
  path = require('path'),
  rimraf = require('rimraf'),
  _ = require('lodash'),
  spawn = require('child_process').spawn;
var docker = require('../docker-Utils/spec_helper').docker;
var MemoryStream = require('memorystream');
var expect = require('chai').expect;
var Docker = require('dockerode');



var respondInvalidWorkspace = function(res) {
  res.status(400);
  res.json({msg: "Invalid workspace name"});
};

var createWorkspace = function(params, req, res) {
  var potentiallyBadPathName = params.name.split(path.sep);
  var workspaceName = potentiallyBadPathName[potentiallyBadPathName.length-1];

  if(workspaceName === '..') {
    respondInvalidWorkspace(res);
    return;
  }

  fs.mkdir(__dirname + '/../workspaces/' + req.user + "/" + workspaceName, '0700', function(err) {
    if(err) {
      respondInvalidWorkspace(res);
      return;
    }

    res.json({msg: "Workspace " + workspaceName + " was created."});
  });
}

var createWorkspaceKillTimeout = function(req, workspaceProcess, workspaceName) {
  var timeout = setTimeout(function() {
    process.kill(-workspaceProcess.pid, 'SIGTERM');
    req.app.get('runningWorkspaces')[req.user + '/' + workspaceName] = undefined;
    console.info("Killed workspace " + workspaceName);
   }, 900000); //Workspaces have a lifetime of 15 minutes

   return timeout;
};

/*
 * POST/GET create a new workspace
 */
exports.create = function(req, res) {
  if(req.body.name) {
    createWorkspace(req.body, req, res);
  } else {
    respondInvalidWorkspace(res);
  }
}

/*
 * GET workspaces listing.
 */
exports.list = function(req, res){

  console.log("User : " + req.user);
  fs.readdir(__dirname + '/../workspaces/' + req.user, function(err, files) {
    //console.log("Error in listing workspaces. Workspace Directory : " + __dirname + '/../workspaces/');

      var workspaces = [];

      if (files != null || files != undefined) {
          for (var i = 0; i < files.length; i++) {
              // Skip hidden files
              if (files[i][0] === '.') continue;

              workspaces.push({name: files[i]})
          }
      }
      else {
             workspaces.push({name: files[0]})
      }
      res.json({workspaces: workspaces});

  });
};

/**
 * DELETE destroys a workspace
 */
exports.destroy = function(req, res) {
  var potentiallyBadPathName = req.params.name.split(path.sep);
  var workspaceName = potentiallyBadPathName[potentiallyBadPathName.length-1];

  if(workspaceName === '..') {
    respondInvalidWorkspace(res);
    return;
  }

  rimraf(__dirname + "/../workspaces/" + req.user + "/" + workspaceName, function(err) {
    if(err) {
      res.status("500");
      res.json({msg: "Something went wrong :("});
      return;
    }
    res.json({msg: "Successfully deleted " + workspaceName});
  })
};

/*
 * POST to keep the workspace alive
 */
exports.keepAlive = function(req, res) {
    var workspace = req.app.get('runningWorkspaces')[req.user + '/' + req.params.name];
    clearTimeout(workspace.killTimeout);
    workspace.killTimeout = createWorkspaceKillTimeout(req, workspace.process, workspace.name);
    res.send();
}

/*
 * GET run a workspace
 */
 exports.run = function(req, res) {
  var potentiallyBadPathName = req.params.name.split(path.sep);
  var workspaceName = potentiallyBadPathName[potentiallyBadPathName.length-1];

     var isPortTaken = function(port, fn) {
         console.log('checking if port', port, 'is taken');
         var net = require('net')
         var tester = net.createServer()
             .once('error', function (err) {
                 if (err.code != 'EADDRINUSE') return fn(err)
                 console.log('port', port, 'seems to be taken');
                 fn(null, true)
             })
             .once('listening', function() {
                 tester.once('close', function() {
                     console.log('port', port, 'seems to be available');
                     fn(null, false)
                 })
                     .close()
             })
             .listen(3131)
     };
    
    var getNextAvailablePort = function(callback){
        var nextFreeWorkspacePort = req.app.get('nextFreeWorkspacePort');
        
        if(nextFreeWorkspacePort > 10000) {
            nextFreeWorkspacePort = 5000;
        }
        
        nextFreeWorkspacePort = nextFreeWorkspacePort + 1;
        console.log('setting nextFreeWorkspacePort to', nextFreeWorkspacePort);
        req.app.set('nextFreeWorkspacePort', nextFreeWorkspacePort);
        
        isPortTaken(nextFreeWorkspacePort, function(err, taken){
            if(taken){
                getNextAvailablePort(callback);
            } else {
                req.app.set('nextFreeWorkspacePort', nextFreeWorkspacePort);
                callback(nextFreeWorkspacePort);
            }
        });
    };

    if(workspaceName === '..') {
      respondInvalidWorkspace(res);
      return;
    }

     var port = 3131; // refactor to method.

     if(typeof req.app.get('runningWorkspaces')[req.user + '/' + workspaceName] === 'undefined', port){

     //  getNextAvailablePort(function(nextFreePort){
       //     console.log("Starting " + __dirname + ' together /../../c9/server.js for workspace ' + workspaceName + " on port " + nextFreePort);
         //var workspace = spawn(__dirname + '/../../c9/bin/cloud9.sh', ['-w', __dirname + '/../workspaces/' + req.user + '/' + workspaceName, '-l', '0.0.0.0', '-p', nextFreePort], {detached: true});
         var workspace = attachRunningContainer(port, req.user.toString());



         function attachRunningContainer(port, containerName) {



             var request = require("request");
             var Docker = require("dockerode");
             var docker = new Docker({
                 socketPath: "/var/run/docker.sock"
             });
             var noop = function () {};

             var containerOpt = {
                 Image: "spayyavula/mezzy",
                 name : containerName,
                 "Volumes" : {"/cloud9/workspace": {}}
             };

             var startOpt = {
                 "PortBindings": {
                     "3131/tcp": [{"HostPort": "3131"}]
                 },
                 "Binds":["/home/sreekanth/cloud9hub-docker/cloud9hub/workspaces/" + req.user + "/" + workspaceName + ":/cloud9/workspace"]
             };

             /**
              * Get env list from running container
              * @param container
              */
             function runExec(container) {
                 options = {
                     AttachStdout: true,
                     AttachStderr: true,
                     Tty: false,
                     Cmd: ['env']
                 };
                 container.exec(options, function(err, exec) {
                     if (err) return;

                     exec.start(function(err, stream) {
                         if (err) return;

                         stream.setEncoding('utf8');
                         stream.pipe(process.stdout);
                     });
                 });
             }
             //logic to check if container alrealy exists and attach to it.
             docker.createContainer( {
                 Image: 'spayyavula/mezzy',
                 Cmd: ['/bin/bash']
             }, function(err, container) {
                 container.start(startOpt, function(err, data) {
                     runExec(container);
                     if (err != null) {
                         docker.createContainer(containerOpt, function (err, container) {
                             console.log("ERR: " + err);
                             container.start(startOpt, function (err, data) {
                                 request("http://localhost:3131", function (err, response, body) {
                                     console.log(body);

                                     container.stop(noop);
                                 });
                             });
                         });
                     }
                 });
             });


             /*docker.createContainer({ Image: 'spayyavula/mezzy', "name": containerName, "Volumes":{"/cloud9/workspace": {}} }, function (err, container) {
                 container.attach({stream: true, stdout: true, stderr: true, tty: true}, function (err, stream) {
                     stream.pipe(process.stdout);

                     container.start({"Binds":["/home/sreekanth/cloud9:/cloud9/workspace"]}, {"PortBindings": {"3131/tcp": [
                         {"HostPort": "3131"}]}, "ExposedPorts": {
                         "3131/tcp": {}
                     }}, function (err, data) {
                         console.log(data);
                     });
                 });
             });*/
             /*docker.createContainer({Image: "spayyavula/mezzy", name : containerName}, function(err, container) {
                 container.start({"PortBindings": {"3131/tcp": [
                     {"HostPort": port}]}}, {name : containerName}, function(err, data) {
                 });
             });*/



            /* // create a container entity. does not query API
             var container = docker.getContainer(req.user);

             container.start(function (err, data) {
                 console.log(data);
             });*/




         };

        /*workspace.stderr.on('data', function (data) {
            console.log('stdERR: ' + data);
         });*/



            req.app.get('runningWorkspaces')[req.user + '/' + workspaceName] = {
                killTimeout: 120000,
                process: workspace,
                name: workspaceName,
                url: req.app.settings.baseUrl,
                user: req.user
            };


            console.log("baseUrl: " + req.app.settings.baseUrl)
            res.json({msg: "Attempted to start workspace", user: req.user, url: req.app.settings.baseUrl});
     }
 };