# Imports employees from CSV text, all or nothing: every row is validated first, and nothing is
# written unless all of them pass. Row errors carry the spreadsheet row number (the header is row 1).
# Problems with the file as a whole (encoding, malformed CSV, missing columns, size) raise InvalidFile.
#
# Every row creates a new employee. Codes are assigned here, in the same sequence as CreateEmployee,
# and an employee_code column in the file is ignored, like any other extra column.
class ImportEmployeesCsv
  # A problem with the file as a whole. details is keyed by :file, like a validation error.
  class InvalidFile < StandardError
    attr_reader :details

    def initialize(problem)
      @details = { file: [ problem ] }
      super("File #{problem}")
    end
  end

  Result = Data.define(:created_count, :row_errors) do
    def success?
      row_errors.empty?
    end
  end

  # One employee row: its spreadsheet row number and its trimmed cells by column (nil when blank).
  Row = Data.define(:number, :values)
  private_constant :Row

  COLUMNS = %w[full_name email gender job_title department level country hire_date salary].freeze
  ENUM_COLUMNS = %w[gender department level country].freeze
  ISO_DATE = /\A\d{4}-\d{2}-\d{2}\z/
  DATE_FORMAT_MESSAGE = "must be a date in YYYY-MM-DD format".freeze
  BYTE_ORDER_MARK = "﻿".freeze
  FIRST_DATA_ROW = 2
  MAX_ROWS = 10_000
  INSERT_BATCH_SIZE = 1_000

  def self.call(text)
    new(text).call
  end

  def initialize(text)
    @text = text
  end

  def call
    employees, row_errors = build_employees(read_rows)
    return Result.new(created_count: 0, row_errors: row_errors) if row_errors.any?

    insert(employees)
    Result.new(created_count: employees.size, row_errors: [])
  end

  private

  def read_rows
    table = parse_csv(decode(@text))
    check_columns(table.headers)

    rows = employee_rows(table)
    raise InvalidFile, "has no employee rows" if rows.empty?
    raise InvalidFile, "has more than #{MAX_ROWS.to_fs(:delimited)} rows" if rows.size > MAX_ROWS

    rows
  end

  # Uploads arrive as binary, and Excel's "CSV UTF-8" starts with a byte order mark.
  def decode(raw)
    text = raw.dup.force_encoding(Encoding::UTF_8)
    raise InvalidFile, 'must be UTF-8 encoded (in Excel, save as "CSV UTF-8")' unless text.valid_encoding?

    text = text.delete_prefix(BYTE_ORDER_MARK)
    raise InvalidFile, "is empty" if text.strip.empty?

    text
  end

  def parse_csv(text)
    CSV.parse(text, headers: true, header_converters: ->(header) { normalize_header(header) })
  rescue CSV::MalformedCSVError => e
    raise InvalidFile, "is not valid CSV (#{e.message})"
  end

  # So " Hire Date " matches hire_date.
  def normalize_header(header)
    header.to_s.strip.downcase.gsub(/\s+/, "_")
  end

  def check_columns(headers)
    missing = COLUMNS - headers
    raise InvalidFile, "is missing columns: #{missing.join(', ')}" if missing.any?
  end

  # Spreadsheets leave behind rows of empty cells. They are skipped but still counted, so row
  # numbers keep matching the spreadsheet.
  def employee_rows(table)
    rows = []
    table.each.with_index(FIRST_DATA_ROW) do |csv_row, number|
      next if csv_row.fields.all?(&:blank?)

      values = COLUMNS.index_with { |column| csv_row[column].to_s.strip.presence }
      rows << Row.new(number: number, values: values)
    end
    rows
  end

  # Validates every row. Returns the valid employees and the errors of the invalid rows.
  def build_employees(rows)
    employees = []
    row_errors = []
    first_row_by_email = {}

    rows.each do |row|
      employee, errors = build(row)

      # Validation has normalized the email, so this comparison ignores case.
      email = employee.email
      if email && first_row_by_email.key?(email)
        errors[:email] = errors.fetch(:email, []) + [ "is also in row #{first_row_by_email[email]}" ]
      elsif email
        first_row_by_email[email] = row.number
      end

      if errors.any?
        row_errors << { row: row.number, errors: errors }
      else
        employees << employee
      end
    end

    [ employees, row_errors ]
  end

  # An unsaved employee for the row and its validation errors. employee_code is left blank and its
  # errors dropped, because codes are assigned at insert time.
  def build(row)
    attributes = row.values.dup
    ENUM_COLUMNS.each { |column| attributes[column] = enum_value(column, attributes[column]) }
    attributes["hire_date"] = parse_date(row.values["hire_date"])

    employee = Employee.new(attributes)
    employee.valid?
    errors = employee.errors.to_hash.except(:employee_code)

    # The model only sees nil for an unreadable date, and would report it as blank.
    if row.values["hire_date"] && attributes["hire_date"].nil?
      errors[:hire_date] = [ DATE_FORMAT_MESSAGE ]
    end

    [ employee, errors ]
  end

  # A fixed-list cell can hold the stored value or the label, in any case ("non_binary", "Non-binary").
  # Anything unrecognised is passed through so the model reports it as not in the list.
  def enum_value(column, text)
    return nil if text.nil?

    enum_lookups.fetch(column).fetch(text.downcase, text)
  end

  # For each fixed-list column, the stored value keyed by its lowercased value and label.
  def enum_lookups
    @enum_lookups ||= ENUM_COLUMNS.index_with do |column|
      lookup = {}
      Employee.options_for(column).each do |option|
        lookup[option[:value]] = option[:value]
        lookup[option[:label].downcase] = option[:value]
      end
      lookup
    end
  end

  # Only YYYY-MM-DD: spreadsheet dates like 03/04/2026 mean different days in different locales.
  # Returns nil for any other format, and for impossible dates like 2021-02-30.
  def parse_date(text)
    return nil if text.nil? || !ISO_DATE.match?(text)

    Date.iso8601(text)
  rescue Date::Error
    nil
  end

  # SQLite transactions are IMMEDIATE, so numbering codes inside one means no other writer can take
  # them first. If another writer took an email after validation, the unique index makes
  # insert_all! raise and the whole import rolls back.
  def insert(employees)
    Employee.transaction do
      code_number = CreateEmployee.last_code_number
      records = employees.map do |employee|
        code_number += 1
        employee.attributes.slice(*COLUMNS).merge("employee_code" => CreateEmployee.code_for(code_number))
      end

      records.each_slice(INSERT_BATCH_SIZE) { |batch| Employee.insert_all!(batch) }
    end
  end
end
