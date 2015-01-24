  <div class="container-fluid">
  <div class="row">
    <!-- Player List -->
    <div class="col-md-2">
      <div class="panel panel-default" ng-controller="PlayerListCtrl">
        <div class="panel-heading">
          Players
        </div>
        <div class="panel-body">
          <ul class="list-group">
						<li ng-repeat="player in players" ng-class="{'active':isDrawing(player.id)}" class="list-group-item">{{player.username}}<span class="pull-right">{{player.score}}</span></li>
          </ul>
        </div>
      </div>
    </div> <!-- end of player list -->

    <!-- canvas -->
    <div class="col-md-8">
      <div class="panel panel-default" ng-controller="CanvasCtrl">
        <div class="panel-heading text-center">
          <!--  -->
          <span ng-show="amIDrawing(playerId)"> Your word is <strong>{{currentWord}}</strong></span>
					<span ng-hide="amIDrawing(playerId)"> <strong>{{getCurrentDrawingPlayer().username}}</strong> is currently drawing</span>
        </div>
        <div class="panel-body">
          <canvas id="canvas" width="800" height="600"></canvas>
        </div>
      </div>
    </div> <!-- end of canvas -->

    <!-- chat -->
    <div class="col-md-2">
      <div class="panel panel-default" ng-controller="ChatCtrl">

        <!-- heading -->
        <header class="panel-heading">Chat</header>

        <!-- body -->
        <div class="panel-body">
					<ul class="list-unstyled">
          	<li ng-repeat="mes in messages"><strong>{{mes.name}}:</strong> {{mes.text}}</li>
          </ul>
        </div>

        <!-- footer -->
        <footer class="panel-footer">
					<form role="form" ng-submit="sendMessage()">
						<div class="input-group">
							<input type="text" ng-model="message" class="form-control" />
							<span class="input-group-btn">
								<button class="btn btn-default" type="submit">Send</button>
							</span>
						</div>
					</form>
        </footer>
      </div>
    </div> <!-- end of chat -->
  </div>
</div>