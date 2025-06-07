IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'employee_management')
BEGIN
    CREATE DATABASE employee_management;
END
GO

USE employee_management;
GO

-- Bảng tài khoản người dùng
CREATE TABLE Users (
    user_id INT IDENTITY PRIMARY KEY,
    username NVARCHAR(50) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    role NVARCHAR(10) NOT NULL CHECK (role IN ('admin', 'user')),
    created_at DATETIME DEFAULT GETDATE()
);
GO

-- Bảng nhân viên
CREATE TABLE Employees (
    employee_id INT IDENTITY PRIMARY KEY,
    user_id INT UNIQUE NOT NULL, -- Mỗi nhân viên tương ứng 1 tài khoản
    full_name NVARCHAR(100) NOT NULL,
    gender NVARCHAR(10),
    dob DATE,
    phone NVARCHAR(20),
    email NVARCHAR(100),
    address NVARCHAR(255),
    position NVARCHAR(50),
    base_salary DECIMAL(18, 2) NOT NULL,
    allowance DECIMAL(18, 2) DEFAULT 0,
    deduction DECIMAL(18, 2) DEFAULT 0,
    status NVARCHAR(20) DEFAULT 'Đang làm việc',
    created_by INT NOT NULL, -- Admin tạo
    created_at DATETIME DEFAULT GETDATE(),
    updated_at DATETIME DEFAULT GETDATE(),

    FOREIGN KEY (user_id) REFERENCES Users(user_id),
    FOREIGN KEY (created_by) REFERENCES Users(user_id)
);
GO

-- Bảng tính lương
CREATE TABLE Salaries (
    salary_id INT IDENTITY PRIMARY KEY,
    employee_id INT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    base_salary DECIMAL(18,2) NOT NULL,
    allowance DECIMAL(18,2),
    deduction DECIMAL(18,2),
    total_salary AS (base_salary + allowance - deduction) PERSISTED,
    created_at DATETIME DEFAULT GETDATE(),
    
    FOREIGN KEY (employee_id) REFERENCES Employees(employee_id),
    CONSTRAINT UC_Salary_Month UNIQUE (employee_id, month, year)
);
GO
-- Tạo admin đầu tiên
INSERT INTO Users (username, password_hash, role) VALUES
('admin', 'admin123', 'admin');
GO
--Stored Procedure thêm nhân viên kèm tài khoản
CREATE PROCEDURE sp_CreateEmployeeWithAccount
    @username NVARCHAR(50),
    @password_hash NVARCHAR(255),
    @full_name NVARCHAR(100),
    @gender NVARCHAR(10),
    @dob DATE,
    @phone NVARCHAR(20),
    @email NVARCHAR(100),
    @address NVARCHAR(255),
    @position NVARCHAR(50),
    @base_salary DECIMAL(18,2),
    @allowance DECIMAL(18,2),
    @deduction DECIMAL(18,2),
    @created_by INT  -- ID của admin đang thao tác
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Tạo tài khoản user
        INSERT INTO Users (username, password_hash, role)
        VALUES (@username, @password_hash, 'user');

        DECLARE @new_user_id INT = SCOPE_IDENTITY();

        -- 2. Tạo nhân viên
        INSERT INTO Employees (
            user_id, full_name, gender, dob, phone, email, address,
            position, base_salary, allowance, deduction, created_by
        )
        VALUES (
            @new_user_id, @full_name, @gender, @dob, @phone, @email, @address,
            @position, @base_salary, @allowance, @deduction, @created_by
        );

        COMMIT;
    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO

--Stored Procedure sửa thông tin nhân viên và tài khoản
CREATE PROCEDURE sp_UpdateEmployeeWithAccount
    @employee_id INT,
    @username NVARCHAR(50),
    @password_hash NVARCHAR(255) = NULL,  -- Có thể không đổi mật khẩu
    @full_name NVARCHAR(100),
    @gender NVARCHAR(10),
    @dob DATE,
    @phone NVARCHAR(20),
    @email NVARCHAR(100),
    @address NVARCHAR(255),
    @position NVARCHAR(50),
    @base_salary DECIMAL(18,2),
    @allowance DECIMAL(18,2),
    @deduction DECIMAL(18,2),
    @status NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Lấy user_id của nhân viên cần sửa
        DECLARE @user_id INT;
        SELECT @user_id = user_id FROM Employees WHERE employee_id = @employee_id;

        IF @user_id IS NULL
        BEGIN
            THROW 50001, 'Không tìm thấy nhân viên', 1;
        END

        -- Cập nhật tài khoản (username và mật khẩu nếu có)
        UPDATE Users
        SET username = @username
            -- Cập nhật mật khẩu nếu được truyền vào
            , password_hash = CASE WHEN @password_hash IS NOT NULL THEN @password_hash ELSE password_hash END
        WHERE user_id = @user_id;

        -- Cập nhật thông tin nhân viên
        UPDATE Employees
        SET full_name = @full_name,
            gender = @gender,
            dob = @dob,
            phone = @phone,
            email = @email,
            address = @address,
            position = @position,
            base_salary = @base_salary,
            allowance = @allowance,
            deduction = @deduction,
            status = @status,
            updated_at = GETDATE()
        WHERE employee_id = @employee_id;

        COMMIT;
    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO

--Stored Procedure xóa nhân viên và tài khoản
CREATE PROCEDURE sp_DeleteUserWithEmployeeAndSalary
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Lấy employee_id tương ứng
        DECLARE @employee_id INT;
        SELECT @employee_id = employee_id FROM Employees WHERE user_id = @user_id;

        IF @employee_id IS NOT NULL
        BEGIN
            -- Xóa lương trước (vì phụ thuộc vào employee_id)
            DELETE FROM Salaries WHERE employee_id = @employee_id;

            -- Xóa nhân viên
            DELETE FROM Employees WHERE employee_id = @employee_id;
        END

        -- Cuối cùng xóa tài khoản
        DELETE FROM Users WHERE user_id = @user_id;

        COMMIT;
    END TRY
    BEGIN CATCH
        ROLLBACK;
        THROW;
    END CATCH
END;
GO


--Stored Procedure tính lương 1 nhân viên
CREATE PROCEDURE sp_CalculateSalary
    @employee_id INT,
    @month INT,
    @year INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @base_salary DECIMAL(18,2),
            @allowance DECIMAL(18,2),
            @deduction DECIMAL(18,2);

    SELECT 
        @base_salary = base_salary,
        @allowance = allowance,
        @deduction = deduction
    FROM Employees
    WHERE employee_id = @employee_id;

    -- Kiểm tra nếu chưa có bản ghi thì thêm mới
    IF NOT EXISTS (
        SELECT 1 FROM Salaries WHERE employee_id = @employee_id AND month = @month AND year = @year
    )
    BEGIN
        INSERT INTO Salaries (employee_id, month, year, base_salary, allowance, deduction)
        VALUES (@employee_id, @month, @year, @base_salary, @allowance, @deduction);
    END
    ELSE
    BEGIN
        UPDATE Salaries
        SET base_salary = @base_salary,
            allowance = @allowance,
            deduction = @deduction,
            created_at = GETDATE()
        WHERE employee_id = @employee_id AND month = @month AND year = @year;
    END
END;
GO
