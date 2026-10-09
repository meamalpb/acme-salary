class User < ApplicationRecord
  # Login only: no signup or password recovery. Users come from the seed script.
  # :validatable adds the email and password validations.
  devise :database_authenticatable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist
end
