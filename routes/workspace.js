var fs = require('fs'),
  path = require('path'),
  rimraf = require('rimraf'),
  spawn = require('child_process').spawn;

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

var createWorkspaceKillTimeout = function(workspaceProcess, workspaceName) {
  var timeout = setTimeout(function() {
    try {
      process.kill(-workspaceProcess.pid, 'SIGTERM');
      console.info("Killed workspace " + workspaceName);
    } catch (e) {
      console.error("Workspace expired but not found: " + workspaceName);
    }
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
  fs.readdir(__dirname + '/../workspaces/' + req.user, function(err, files) {
    if(err) {
      res.status(500);
      res.json({error: err});
    } else {
      var workspaces = [];
      for(var i=0; i< files.length; i++) {
          // Skip hidden files
          if(files[i][0] === '.') continue;

          workspaces.push({name: files[i]})
      }
      res.json({workspaces: workspaces});
    }
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
 * GET run a workspace
 */
 exports.run = function(req, res) {
  var potentiallyBadPathName = req.params.name.split(path.sep);
  var workspaceName = potentiallyBadPathName[potentiallyBadPathName.length-1];

  if(workspaceName === '..') {
    respondInvalidWorkspace(res);
    return;
  }

   console.log("Starting " + __dirname + '/../../c9/bin/cloud9.sh for workspace ' + workspaceName + " on port " + req.nextFreePort);

   var workspace = spawn(__dirname + '/../../c9/bin/cloud9.sh', [
     '-w', __dirname + '/../workspaces/' + req.user + '/' + workspaceName,
     '-l', '0.0.0.0',
     '-p', req.nextFreePort,
     '--username', req.query['username'],
     '--password', req.query['password']
   ], {detached: true});
   workspace.stderr.on('data', function (data) {
     console.log('stdERR: ' + data);
   });

   req.app.get('runningWorkspaces')[req.user + '/' + workspaceName] = {
     killTimeout: createWorkspaceKillTimeout(workspace, workspaceName),
     process: workspace,
     name: workspaceName
   };

   res.json({msg: "Successfully started workspace", url: req.app.settings.baseUrl + ":" + req.nextFreePort});
 }

/*
 * POST to keep the workspace alive
*/
 exports.keepAlive = function(req, res) {
   var workspace = req.app.get('runningWorkspaces')[req.user + '/' + req.params.name];
   clearTimeout(workspace.killTimeout);
   workspace.killTimeout = createWorkspaceKillTimeout(workspace.process, workspace.name);
   res.send();
 }
