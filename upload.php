<?php
// upload.php - Backup jika JavaScript tidak bekerja
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

$required = ['githubToken', 'githubUser', 'githubRepo', 'commitMessage'];
foreach ($required as $field) {
    if (empty($_POST[$field])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => "Field $field is required"]);
        exit;
    }
}

try {
    $token = $_POST['githubToken'];
    $user = $_POST['githubUser'];
    $repo = $_POST['githubRepo'];
    $branch = $_POST['githubBranch'] ?? 'main';
    $filePath = $_POST['filePath'] ?? $_FILES['file']['name'];
    $commitMessage = $_POST['commitMessage'];

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('File upload error');
    }

    $fileContent = file_get_contents($_FILES['file']['tmp_name']);
    $base64Content = base64_encode($fileContent);

    $url = "https://api.github.com/repos/{$user}/{$repo}/contents/{$filePath}";

    $data = [
        'message' => $commitMessage,
        'content' => $base64Content,
        'branch' => $branch
    ];

    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_HTTPHEADER => [
            'Authorization: token ' . $token,
            'User-Agent: PHP-GitHub-Uploader',
            'Content-Type: application/json',
            'Accept: application/vnd.github.v3+json'
        ]
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $result = json_decode($response, true);

    if ($httpCode === 201) {
        echo json_encode([
            'success' => true,
            'url' => $result['content']['html_url'],
            'download_url' => $result['content']['download_url']
        ]);
    } else {
        throw new Exception($result['message'] ?? 'Unknown error');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>