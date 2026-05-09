-- PostgreSQL 数据库初始化脚本

-- 1. 用户表 (存储微信用户信息)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    openid VARCHAR(128) UNIQUE NOT NULL,
    nickname VARCHAR(64),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0
);;
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);;

-- 2. 任务表 (存储文件处理任务)
CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(64) PRIMARY KEY, -- 对应代码中的 taskId
    user_id UUID REFERENCES users(id),
    tool_type VARCHAR(32) NOT NULL,
    source_file_name VARCHAR(255),
    status VARCHAR(20) NOT NULL, -- PROCESSING, SUCCESS, FAIL
    progress INTEGER DEFAULT 0,
    message TEXT,
    result_data JSONB, -- 存储处理结果，如文件路径、下载链接等
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0
);;
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);;
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);;

-- 3. 王者计分：成员表
CREATE TABLE IF NOT EXISTS king_score_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id), -- 所属用户（创建者）
    real_name VARCHAR(64) NOT NULL,
    game_names TEXT[], -- 游戏曾用名，使用 PG 的数组特性
    total_deducted INTEGER DEFAULT 0,
    daily_deducted INTEGER DEFAULT 0,
    daily_score_date DATE DEFAULT CURRENT_DATE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0
);;
CREATE INDEX IF NOT EXISTS idx_ks_members_user_id ON king_score_members(user_id);;

-- 4. 王者计分：对局会话表
CREATE TABLE IF NOT EXISTS king_score_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title VARCHAR(128),
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, ARCHIVED
    settings JSONB, -- 存储该场对局的特殊设置（如基础分、扣分步长）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0
);;

-- 5. 王者计分：对局记录表
CREATE TABLE IF NOT EXISTS king_score_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES king_score_sessions(id) ON DELETE CASCADE,
    member_id UUID REFERENCES king_score_members(id),
    record_detail JSONB NOT NULL, -- 使用 JSONB 存储灵活的计分详情 (hero, kda, rating, score, match_result, is_mvp)
    match_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0
);;
CREATE INDEX IF NOT EXISTS idx_ks_records_session_id ON king_score_records(session_id);;
CREATE INDEX IF NOT EXISTS idx_ks_records_member_id ON king_score_records(member_id);;
CREATE INDEX IF NOT EXISTS idx_ks_records_detail_gin ON king_score_records USING GIN (record_detail);;

-- 6. 二维码短码表（替代进程内 Map，避免重启丢失/多实例不一致）
CREATE TABLE IF NOT EXISTS qr_short_codes (
    code VARCHAR(16) PRIMARY KEY,
    content TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0
);;
CREATE INDEX IF NOT EXISTS idx_qr_short_codes_expires_at ON qr_short_codes(expires_at);;

-- 7. 密码保险箱条目表
CREATE TABLE IF NOT EXISTS vault_items (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    platform VARCHAR(120) NOT NULL,
    account VARCHAR(160) NOT NULL,
    password_cipher TEXT NOT NULL,
    password_iv VARCHAR(64) NOT NULL,
    note TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0
);;
CREATE INDEX IF NOT EXISTS idx_vault_items_user_id ON vault_items(user_id);;
CREATE INDEX IF NOT EXISTS idx_vault_items_user_platform ON vault_items(user_id, platform);;

-- 8. 密码显示审计表
CREATE TABLE IF NOT EXISTS vault_reveal_audits (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    item_id BIGINT NOT NULL REFERENCES vault_items(id),
    client_ip VARCHAR(128),
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 0
);;
CREATE INDEX IF NOT EXISTS idx_vault_reveal_audits_user_id ON vault_reveal_audits(user_id);;
CREATE INDEX IF NOT EXISTS idx_vault_reveal_audits_item_id ON vault_reveal_audits(item_id);;

-- 自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $BODY$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$BODY$ language 'plpgsql';;

-- 为所有表添加触发器
DROP TRIGGER IF EXISTS update_users_modtime ON users;;
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();;

DROP TRIGGER IF EXISTS update_tasks_modtime ON tasks;;
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE PROCEDURE update_modified_column();;

DROP TRIGGER IF EXISTS update_ks_members_modtime ON king_score_members;;
CREATE TRIGGER update_ks_members_modtime BEFORE UPDATE ON king_score_members FOR EACH ROW EXECUTE PROCEDURE update_modified_column();;

DROP TRIGGER IF EXISTS update_ks_sessions_modtime ON king_score_sessions;;
CREATE TRIGGER update_ks_sessions_modtime BEFORE UPDATE ON king_score_sessions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();;

DROP TRIGGER IF EXISTS update_ks_records_modtime ON king_score_records;;
CREATE TRIGGER update_ks_records_modtime BEFORE UPDATE ON king_score_records FOR EACH ROW EXECUTE PROCEDURE update_modified_column();;

DROP TRIGGER IF EXISTS update_qr_short_codes_modtime ON qr_short_codes;;

DROP TRIGGER IF EXISTS update_vault_items_modtime ON vault_items;;
CREATE TRIGGER update_vault_items_modtime BEFORE UPDATE ON vault_items FOR EACH ROW EXECUTE PROCEDURE update_modified_column();;

DROP TRIGGER IF EXISTS update_vault_reveal_audits_modtime ON vault_reveal_audits;;
CREATE TRIGGER update_vault_reveal_audits_modtime BEFORE UPDATE ON vault_reveal_audits FOR EACH ROW EXECUTE PROCEDURE update_modified_column();;
CREATE TRIGGER update_qr_short_codes_modtime BEFORE UPDATE ON qr_short_codes FOR EACH ROW EXECUTE PROCEDURE update_modified_column();;