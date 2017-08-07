<?php

// Connexion DB
if (!isset($bdd)) {
	include(__DIR__ . '/connexion_sql.php');
}

// If ajax request
if (isset($_POST['ajaxType'])) {

	// Which type of request
	switch ($_POST['ajaxType']) {

		// Add a new entry
		case 1:
			try {
				$req = $bdd->prepare('INSERT INTO bookmarks(url, name) VALUES (:url, :name)');
				$req->execute(array(
					'url' => htmlspecialchars($_POST['url'], ENT_QUOTES, 'UTF-8'),
					'name' => htmlspecialchars($_POST['name'], ENT_QUOTES, 'UTF-8'),
				));

				// We get the id of this entry
				$id = $bdd->lastInsertId();
				$req->closeCursor();

				// GOOD
				echo $id;
			}
			catch (Exception $e) {
				echo 'Error catched : ',  $e->getMessage();
			}
			break;

		// Delete an entry
		case 2:
			try {
				$req = $bdd->query('DELETE FROM bookmarks WHERE id = ' . $_POST['id']);
				$req->closeCursor();

				// GOOD
				echo 1;
			}
			catch (Exception $e) {
				echo 'Error catched : ',  $e->getMessage();
			}
			break;

		// Update an entry
		case 3:
			try {
				$req = $bdd->prepare('UPDATE bookmarks SET url = :url, name = :name WHERE id = :id');
				$req->execute(array(
					'url' => htmlspecialchars($_POST['url'], ENT_QUOTES, 'UTF-8'),
					'name' => htmlspecialchars($_POST['name'], ENT_QUOTES, 'UTF-8'),
					'id' => $_POST['id']
				));
				$req->closeCursor();

				// GOOD
				echo 1;
			}
			catch (Exception $e) {
				echo 'Error catched : ',  $e->getMessage();
			}
			break;
	}
}
