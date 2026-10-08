# Backend

Rails 8.1 API for ACME Salary. Uses SQLite.

## Requirements

- Ruby 3.4.10 (see `.ruby-version`)

## Setup

```sh
bundle install
bin/rails db:prepare
```

## Run

```sh
bin/rails server   # http://localhost:3000
```

## Test and lint

```sh
bundle exec rspec
bin/rubocop
```
