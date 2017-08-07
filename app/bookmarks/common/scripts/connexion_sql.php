<?php
	$pdo_options[PDO::ATTR_ERRMODE] = PDO::ERRMODE_EXCEPTION;

	$bdd = new PDO('mysql:host=paulgiroltdb.mysql.db;dbname=paulgiroltdb', 'paulgiroltdb', 'pignoufPGDB1', $pdo_options);
	// $bdd = new PDO('mysql:host=localhost;dbname=bookmarks', 'root', 'p', $pdo_options);

	$bdd->exec("SET CHARACTER SET utf8");
