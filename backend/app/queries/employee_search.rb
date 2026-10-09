# Search, filter and sort for the employee list (and, later, the CSV export).
# Raises InvalidParam, carrying per-param messages, for unknown enum, status, sort or direction values.
#
# Search uses LIKE, which SQLite matches case-insensitively for ASCII only, so
# "josé" will not match "José".
class EmployeeSearch
  class InvalidParam < StandardError
    attr_reader :details

    def initialize(details)
      @details = details
      super("Invalid params: #{details.keys.join(', ')}")
    end
  end

  STATUSES = %w[active terminated all].freeze
  DIRECTIONS = %w[asc desc].freeze
  FILTERS = %w[country department level].freeze
  # Public sort name => column. terminated_on is only valid for terminated employees.
  SORT_COLUMNS = { "full_name" => :full_name, "salary" => :salary, "hire_date" => :hire_date }.freeze
  TERMINATED_SORT_COLUMNS = SORT_COLUMNS.merge("terminated_on" => :deleted_at).freeze

  def initialize(params)
    @params = params.to_h.with_indifferent_access
  end

  def call
    errors = validate
    raise InvalidParam, errors if errors.any?

    scope = base_scope
    scope = search(scope)
    scope = filter(scope)
    scope.order(sort_column => direction.to_sym, id: :asc)
  end

  private

  def base_scope
    case value(:status)
    when "terminated" then Employee.only_deleted
    when "all" then Employee.with_deleted
    else Employee.all
    end
  end

  # terminated_on is meaningless when only active employees are listed.
  def sort_columns
    value(:status).in?(%w[terminated all]) ? TERMINATED_SORT_COLUMNS : SORT_COLUMNS
  end

  def sort_column
    sort_columns.fetch(value(:sort) || "full_name")
  end

  def direction
    value(:direction) || "asc"
  end

  # A blank param (such as ?country= from a cleared filter) counts as absent.
  def value(key)
    @params[key].to_s.strip.presence
  end

  def validate
    errors = {}
    status = value(:status)
    errors["status"] = [ "must be one of: #{STATUSES.join(', ')}" ] if status && !STATUSES.include?(status)

    FILTERS.each do |filter|
      given = value(filter)
      next if given.nil? || Employee.defined_enums.fetch(filter).key?(given)

      errors[filter] = [ "is not a valid #{filter}" ]
    end

    sort = value(:sort)
    errors["sort"] = [ "must be one of: #{sort_columns.keys.join(', ')}" ] if sort && !sort_columns.key?(sort)

    given_direction = value(:direction)
    errors["direction"] = [ "must be one of: #{DIRECTIONS.join(', ')}" ] if given_direction && !DIRECTIONS.include?(given_direction)
    errors
  end

  def search(scope)
    query = value(:q)
    return scope unless query

    pattern = "%#{Employee.sanitize_sql_like(query)}%"
    scope.where("full_name LIKE :p ESCAPE '\\' OR email LIKE :p ESCAPE '\\' OR employee_code LIKE :p ESCAPE '\\'", p: pattern)
  end

  def filter(scope)
    FILTERS.each do |filter|
      given = value(filter)
      scope = scope.where(filter => given) if given
    end
    scope
  end
end
