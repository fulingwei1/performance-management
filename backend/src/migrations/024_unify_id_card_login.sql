-- 统一登录方式：姓名/工号 + 身份证后六位。
-- 历史 password 列不再参与登录，清空旧初始密码/自定义密码，避免后续误用。

ALTER TABLE employees
ALTER COLUMN password DROP NOT NULL;

UPDATE employees
SET password = NULL,
    must_change_password = FALSE;
