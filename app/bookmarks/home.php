<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">

	<title>Bookmarks</title>

	<!-- FAVICON -->
	<!-- <link rel="icon" href="favicon.ico"> -->

	<!-- RESPONSIVE -->
	<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

	<!-- CSS -->
	<link rel="stylesheet" href="css/home.min.css">

	<!-- LIB -->
<!-- <script src="//use.fontawesome.com/a5176dbf70.js"></script> -->
	<script src="common/js/lib/jquery-2.1.1.min.js"></script>
	<script src="common/js/lib/font-awesome.js"></script>

	<!-- JS -->
	<!-- <script src="common/js/common.js"></script> -->
	<!-- <script src="js/home.js"></script> -->
	<!-- <script src="js/search.js"></script> -->
	<!-- <script src="js/pagination.js"></script> -->
	<script src="common/js/common.min.js"></script>
	<script src="js/search.min.js"></script>
	<script src="js/pagination.min.js"></script>
	<script src="js/home.min.js"></script>
</head>
<body>
	<!-- MAIN WRAPPER -->
	<div id="main-wrapper">
		
		<!-- HEADER -->
		<header>
			<a href="./">
				<h1>Bookmarks</h1>
			</a>
			<div id="search-wrapper">
				<input type="text" class="search-input">
				<div>
					<i class="fa fa-search"></i>
				</div>
			</div>
		</header>

		<!-- ADD NEW BOOKMARK -->
		<div id="add-bookmark-wrapper">
			<div class="content">
				<input type="text" class="name" placeholder="name...">
				<input type="text" class="url" placeholder="url...">
				<button id="add-bookmark">
					<i class="fa fa-plus-circle"></i> Add a bookmark
				</button>
			</div>
			<div class="error">
				Error message
			</div>
		</div>

		<!-- BOOKMARKS -->
		<div id="bookmarks-list">
			
		</div>

		<!-- PAGINATION -->
		<div id="pagination">
			<div class="content">
				<div id="prev">prev</div>
				<ul id="paginationList"></ul>
				<div id="next">next</div>
			</div>
		</div>
	</div>
</body>
