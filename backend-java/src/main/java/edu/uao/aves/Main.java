package edu.uao.aves;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Executors;

/**
 * Servidor Java mínimo de desarrollo para Aves UAO.
 * Sirve el frontend y expone endpoints de estado; no administra ni persiste registros.
 */
public final class Main {
    private static final Map<String, String> MIME_TYPES = Map.ofEntries(
        Map.entry(".html", "text/html; charset=utf-8"),
        Map.entry(".css", "text/css; charset=utf-8"),
        Map.entry(".js", "text/javascript; charset=utf-8"),
        Map.entry(".json", "application/json; charset=utf-8"),
        Map.entry(".svg", "image/svg+xml"),
        Map.entry(".png", "image/png"),
        Map.entry(".jpg", "image/jpeg"),
        Map.entry(".jpeg", "image/jpeg"),
        Map.entry(".webp", "image/webp")
    );

    private Main() { }

    public static void main(String[] args) throws IOException {
        int port = Integer.parseInt(System.getenv().getOrDefault("PORT", "3000"));
        Path root = Path.of(System.getenv().getOrDefault("AVES_WEB_ROOT", ".")).toRealPath();
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/", exchange -> handle(exchange, root));
        server.setExecutor(Executors.newFixedThreadPool(8));
        server.start();
        System.out.printf(Locale.ROOT, "Aves UAO disponible en http://0.0.0.0:%d (root: %s)%n", port, root);
    }

    private static void handle(HttpExchange exchange, Path root) throws IOException {
        try (exchange) {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();
            if (!method.equals("GET") && !method.equals("HEAD")) {
                respond(exchange, 405, "application/json; charset=utf-8", "{\"error\":\"Method not allowed\"}", method.equals("HEAD"));
                return;
            }
            if (path.equals("/api/v1/health")) {
                String body = "{\"status\":\"ok\",\"app\":\"aves-uao\",\"databaseConfigured\":false,\"speciesApi\":\"pending\",\"eightWallConfigured\":false}";
                respond(exchange, 200, "application/json; charset=utf-8", body, method.equals("HEAD"));
                return;
            }
            if (path.equals("/api/v1/species") || path.startsWith("/api/v1/species/")) {
                // TODO: DATABASE — implementar SpeciesRepository con el esquema y el motor
                // que la Universidad facilite; añadir paginación, búsqueda, filtros y errores.
                // TODO: API — reemplazar este 501 por DTOs validados y políticas CORS/auth.
                respond(exchange, 501, "application/json; charset=utf-8",
                    "{\"status\":\"pending\",\"message\":\"El catálogo real aún no está conectado a una base de datos.\",\"databaseConfigured\":false}",
                    method.equals("HEAD"));
                return;
            }
            serveFile(exchange, root, path, method.equals("HEAD"));
        }
    }

    private static void serveFile(HttpExchange exchange, Path root, String urlPath, boolean head) throws IOException {
        String relative = urlPath.equals("/") ? "index.html" : urlPath.substring(1);
        Path candidate = root.resolve(relative).normalize();
        if (!candidate.startsWith(root)) {
            respond(exchange, 400, "application/json; charset=utf-8", "{\"error\":\"Invalid path\"}", head);
            return;
        }
        if (Files.isDirectory(candidate)) candidate = candidate.resolve("index.html");
        if (!Files.isRegularFile(candidate)) {
            // Defensive real-path check prevents a symlink inside the workspace from escaping it.
            respond(exchange, 404, "application/json; charset=utf-8", "{\"error\":\"Not found\"}", head);
            return;
        }
        Path realFile = candidate.toRealPath();
        if (!realFile.startsWith(root)) {
            respond(exchange, 403, "application/json; charset=utf-8", "{\"error\":\"Forbidden\"}", head);
            return;
        }
        String fileName = realFile.getFileName().toString();
        int dot = fileName.lastIndexOf('.');
        String extension = dot < 0 ? "" : fileName.substring(dot).toLowerCase(Locale.ROOT);
        byte[] bytes = Files.readAllBytes(realFile);
        Headers headers = exchange.getResponseHeaders();
        headers.set("Content-Type", MIME_TYPES.getOrDefault(extension, "application/octet-stream"));
        headers.set("Cache-Control", "no-cache");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        exchange.sendResponseHeaders(200, head ? -1 : bytes.length);
        if (!head) exchange.getResponseBody().write(bytes);
    }

    private static void respond(HttpExchange exchange, int status, String contentType, String body, boolean head) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        Headers headers = exchange.getResponseHeaders();
        headers.set("Content-Type", contentType);
        headers.set("Cache-Control", "no-store");
        headers.set("X-Content-Type-Options", "nosniff");
        exchange.sendResponseHeaders(status, head ? -1 : bytes.length);
        if (!head) exchange.getResponseBody().write(bytes);
    }
}
