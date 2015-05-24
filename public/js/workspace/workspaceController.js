var WorkspaceCtrl = function($scope, $http, $timeout, $sce) {
  $scope.workspaces = [];
  $scope.currentWorkspace = false; // {name: null, url: null, editing: false};
  $scope.loadingWorkspace = false;
  $scope.iframeSrc = '';

  $http.get('/workspace')
  .success(function(data) { console.log(data); $scope.workspaces = data.workspaces; })
  .error(function(err) { alert(err.msg) });

  var _sendKeepAlive = function() {
    $http.post('/workspace/' + $scope.currentWorkspace.name).success(function() {
      $timeout(_sendKeepAlive, 300000);
    });
  };

  $scope.startEditing = function() {
    alert("Editing the workspace");
    alert($scope.currentWorkspace.url)
    $scope.currentWorkspace.editing = true;
    $scope.iframeSrc = $sce.trustAsResourceUrl($scope.currentWorkspace.url);
  };

  var createWorkspace = function() {
    alert("Creating Workspace");
    var wsName = $scope.currentWorkspace.name;
    $scope.loadingWorkspace = true;
    $http.post('/workspace/', {name: wsName})
    .success(function(data) {
            alert(data.msg);
      $scope.loadingWorkspace = false;
      $scope.workspaces.push({name: wsName});
      $scope.currentWorkspace = false;
    })
    .error(function(err) {
      alert("Error: " + err.msg);
    });


  } 
  
  $scope.saveWorkspace = function(){
    $scope.iframeSrc = '';
    if(!$scope.currentWorkspace.url){
        createWorkspace();  
    }
  };
 
  $scope.blankWorkspace = function() {
    $scope.iframeSrc = '';
    $scope.currentWorkspace = {
        url: '',
        name: '',
        editing: false
    }
  };

  $scope.deleteWorkspace = function(name) {
    $scope.iframeSrc = '';
    if(!window.confirm("Do you really want to delete this workspace? All your files in that workspace will be gone forever!")) return;
    $http.delete('/workspace/' + name)
    .success(function(data){
      console.log(data);
      alert(data.msg);
      
      for(var i=0;i<$scope.workspaces.length;i++) {
        if($scope.workspaces[i].name === name) {
          $scope.workspaces.splice(i,1);
          break;
        }
      }
      
      $scope.currentWorkspace = false;
    })
    .error(function(err) {
      console.log("ERR:", err);
      $scope.currentWorkspace = false;
    });
  }
  
  $scope.runWorkspace = function(name) {
    alert("Inside Run workspace");
    $scope.iframeSrc = '';
    $scope.loadingWorkspace = true;
    $http.get('/workspace/' + name).success(function(data) {
        $scope.currentWorkspace = {};
        $scope.currentWorkspace.name = name;
        $scope.currentWorkspace.url = "http://0.0.0.0:3131";      //data.url;
        $scope.currentWorkspace.user = data.user;
        $scope.currentWorkspace.editing = false;
        _sendKeepAlive();
        $scope.loadingWorkspace = false;
    }).error(function(err) {
        $scope.loadingWorkspace = false;
        alert("Error: " + err);
        console.log(err);
    });
  }
}