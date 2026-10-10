RSpec.configure do |config|
  config.include ActiveJob::TestHelper, type: :request
  config.include ActiveJob::TestHelper, type: :job
end
