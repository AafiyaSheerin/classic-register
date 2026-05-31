CREATE DATABASE IF NOT EXISTS classic_register CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE classic_register;

CREATE TABLE IF NOT EXISTS users (
  id            INT          PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          ENUM('admin','manager') DEFAULT 'admin',
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id            INT           PRIMARY KEY AUTO_INCREMENT,
  employee_id   VARCHAR(20)   NOT NULL UNIQUE,
  name          VARCHAR(100)  NOT NULL,
  role          VARCHAR(100)  NOT NULL,
  department    VARCHAR(100)  DEFAULT 'Embroidery',
  phone         VARCHAR(20),
  email         VARCHAR(100),
  address       TEXT,
  salary_type   ENUM('monthly','daily','hourly','piece') NOT NULL,
  base_pay      DECIMAL(10,2) NOT NULL,
  join_date     DATE          NOT NULL,
  status        ENUM('active','inactive') DEFAULT 'active',
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id           INT    PRIMARY KEY AUTO_INCREMENT,
  employee_id  INT    NOT NULL,
  date         DATE   NOT NULL,
  status       ENUM('present','absent','half_day','on_leave') DEFAULT 'absent',
  check_in     TIME,
  check_out    TIME,
  hours_worked DECIMAL(5,2) DEFAULT 0,
  notes        VARCHAR(255),
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY uq_attendance (employee_id, date)
);

CREATE TABLE IF NOT EXISTS leaves (
  id            INT     PRIMARY KEY AUTO_INCREMENT,
  employee_id   INT     NOT NULL,
  type          ENUM('sick','casual','emergency','unpaid') NOT NULL,
  from_date     DATE    NOT NULL,
  to_date       DATE    NOT NULL,
  total_days    INT     NOT NULL,
  reason        TEXT    NOT NULL,
  status        ENUM('pending','approved','rejected') DEFAULT 'pending',
  approved_by   INT,
  approval_note VARCHAR(255),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS overtime (
  id                INT           PRIMARY KEY AUTO_INCREMENT,
  employee_id       INT           NOT NULL,
  date              DATE          NOT NULL,
  hours             DECIMAL(5,2)  DEFAULT 0,
  rate_multiplier   DECIMAL(4,2)  DEFAULT 1.5,
  pieces_completed  INT           DEFAULT 0,
  notes             VARCHAR(255),
  created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY uq_overtime (employee_id, date)
);

CREATE TABLE IF NOT EXISTS salary_logs (
  id               INT           PRIMARY KEY AUTO_INCREMENT,
  employee_id      INT           NOT NULL,
  month            TINYINT       NOT NULL,
  year             SMALLINT      NOT NULL,
  base_pay         DECIMAL(10,2) NOT NULL,
  days_worked      TINYINT       DEFAULT 0,
  hours_worked     DECIMAL(8,2)  DEFAULT 0,
  pieces_completed INT           DEFAULT 0,
  overtime_pay     DECIMAL(10,2) DEFAULT 0,
  leave_deduction  DECIMAL(10,2) DEFAULT 0,
  other_deductions DECIMAL(10,2) DEFAULT 0,
  bonus            DECIMAL(10,2) DEFAULT 0,
  gross_salary     DECIMAL(10,2) NOT NULL,
  net_salary       DECIMAL(10,2) NOT NULL,
  status           ENUM('draft','paid') DEFAULT 'paid',
  paid_date        DATE,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  UNIQUE KEY uq_salary_log (employee_id, month, year)
);

INSERT INTO users (username, password_hash, full_name, role) VALUES
('admin', 'admin123', 'Administrator', 'admin')
ON DUPLICATE KEY UPDATE username = username;

INSERT INTO employees (employee_id, name, role, department, phone, salary_type, base_pay, join_date) VALUES
('EMP001', 'Priya Sharma',  'Lead Embroiderer',  'Embroidery', '9876543210', 'monthly', 18000.00, '2022-01-15'),
('EMP002', 'Ravi Kumar',    'Embroidery Worker', 'Embroidery', '9876543211', 'daily',     600.00, '2022-03-20'),
('EMP003', 'Meena Devi',    'Quality Checker',   'Quality',    '9876543212', 'monthly', 15000.00, '2022-06-01'),
('EMP004', 'Suresh Babu',   'Piece Worker',      'Production', '9876543213', 'piece',      12.00, '2023-01-10'),
('EMP005', 'Lakshmi R',     'Senior Embroiderer','Embroidery', '9876543214', 'hourly',     80.00, '2021-11-05')
ON DUPLICATE KEY UPDATE employee_id = employee_id;