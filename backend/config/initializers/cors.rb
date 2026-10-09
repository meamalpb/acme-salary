# The React app runs on another origin, so the API must allow it.
# CORS_ORIGINS is a comma-separated list; the default is the Vite dev server.
allowed_origins = ENV.fetch("CORS_ORIGINS", "http://localhost:5173").split(",").map(&:strip)

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*allowed_origins)

    resource "*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      # Login returns the JWT in Authorization; the CSV filename is in Content-Disposition.
      expose: %w[Authorization Content-Disposition]
  end
end
