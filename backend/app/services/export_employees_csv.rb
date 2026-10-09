# Renders an employee scope as CSV, keeping the scope's order.
# Hand-rolled because csv is no longer a default gem in Ruby 3.4 and new gems need approval.
#
# Text cells that start with = + - @ (or a tab or CR) are prefixed with ' so Excel and
# Sheets show them as text instead of running them as formulas.
class ExportEmployeesCsv
  COLUMNS = %i[employee_code full_name email gender job_title department level country hire_date salary].freeze
  FORMULA_TRIGGERS = /\A[=+\-@\t\r]/
  EOL = "\r\n".freeze

  def self.call(...) = new(...).call

  def initialize(scope, include_terminated: false)
    @scope = scope
    @include_terminated = include_terminated
  end

  def call
    rows = @scope.pluck(*columns).map { |row| row.map { |cell| format_cell(cell) } }
    ([ headers ] + rows).map { |row| row.map { |cell| quote(cell) }.join(",") }.join(EOL) + EOL
  end

  private

  def headers
    columns.map { |column| column == :deleted_at ? "terminated_on" : column.to_s }
  end

  def columns
    @include_terminated ? COLUMNS + [ :deleted_at ] : COLUMNS
  end

  def format_cell(cell)
    case cell
    when nil then ""
    when Time, ActiveSupport::TimeWithZone then cell.to_date.iso8601
    when Date then cell.iso8601
    else cell.to_s
    end
  end

  def quote(cell)
    cell = "'#{cell}" if cell.match?(FORMULA_TRIGGERS)
    cell.match?(/[",\r\n]/) ? %("#{cell.gsub('"', '""')}") : cell
  end
end
