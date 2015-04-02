angular.module('c9hub', ['workspace', 'ngRoute']).config(function($routeProvider) {
    $routeProvider.when('/', {templateUrl: "/partials/login.ejs"});
    $routeProvider.when('/dashboard', {controller: WorkspaceCtrl, templateUrl: "/partials/workspace.html"});
});