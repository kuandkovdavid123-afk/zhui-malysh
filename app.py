"""
Жуй-Малыш (ChewTracker) - Интеллектуальный трекер прикорма и развития навыка жевания для родителей.
Flask Backend с системой многопользовательской авторизации, базой данных SQLite и REST API.
"""
import os
import json
import sqlite3
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, render_template, request, jsonify, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__, static_folder='static', template_folder='templates')
app.secret_key = os.environ.get('SECRET_KEY', 'chew_tracker_secure_session_key_2026_auth')
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(days=30)
)

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'chew_tracker.db')

DEFAULT_ACHIEVEMENTS = [
    ('first_chew', 'Первый Хруст', 'chewing', 'Первый успешный прием пищи с кусочками вместо пюре', 'award'),
    ('cucumber_master', 'Мастер Огурчика', 'chewing', 'Ребенок сам откусил и прожевал твердый брусочек огурца', 'sparkles'),
    ('no_puree_week', 'Неделя без Баночек', 'challenge', '7 дней подряд в рационе присутствуют домашние кусочки', 'calendar-check'),
    ('jaw_champion', 'Челюстной Чемпион', 'speech', 'Более 75% пищи за неделю пережевано самостоятельно', 'crown'),
    ('gag_brave', 'Смелый Глотатель', 'safety', 'Научился безопасно откашливать и выталкивать языком без страха', 'shield-check'),
    ('taste_explorer', 'Храбрый Дегустатор', 'nutrition', 'Попробовал 20 разнообразных вкусов и текстур', 'compass'),
    ('speech_starter', 'Будущий Оратор', 'speech', '10 дней активного перекладывания пищи языком на боковые десны', 'mic'),
    ('apple_conqueror', 'Покоритель Яблока', 'challenge', 'Успешно справился с тонким слайсом свежего хрустящего яблока', 'apple'),
]

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_user_data(user_id, child_name='Малыш', birth_date=None, gender='boy', feeding_stage='stage_1'):
    """Инициализирует профиль ребенка, достижения и челлендж для нового пользователя."""
    with get_db() as conn:
        cursor = conn.cursor()
        if not birth_date:
            birth_date = datetime.now().strftime('%Y-%m-%d')
        
        # Создаем профиль ребенка для пользователя
        cursor.execute('''
            INSERT INTO child_profile (user_id, name, birth_date, gender, feeding_stage, teeth_count, allergies, gag_reflex_level, gag_reflex_notes, favorite_foods, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, 0, '[]', 'low', '', '[]', '', ?)
        ''', (user_id, child_name, birth_date, gender, feeding_stage, datetime.now().isoformat()))
        
        # Создаем список достижений пользователя (все изначально заблокированы)
        for code, title, cat, desc, icon in DEFAULT_ACHIEVEMENTS:
            cursor.execute('''
                INSERT OR IGNORE INTO user_achievements (user_id, code, title, category, description, icon, unlocked, unlocked_at)
                VALUES (?, ?, ?, ?, ?, ?, 0, NULL)
            ''', (user_id, code, title, cat, desc, icon))
            
        # Создаем 7 дней челленджа "Неделя без пюре"
        for day in range(1, 8):
            cursor.execute('''
                INSERT OR IGNORE INTO user_challenge_days (user_id, challenge_name, day_number, completed, completed_at)
                VALUES (?, 'week_no_puree', ?, 0, NULL)
            ''', (user_id, day))
            
        conn.commit()

def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Users Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT
            )
        ''')
        
        # 2. Child Profile Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS child_profile (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                name TEXT NOT NULL DEFAULT 'Малыш',
                birth_date TEXT NOT NULL DEFAULT '2026-02-15',
                gender TEXT DEFAULT 'boy',
                feeding_stage TEXT DEFAULT 'stage_4',
                teeth_count INTEGER DEFAULT 4,
                allergies TEXT DEFAULT '["Коровье молоко (БКМ)"]',
                gag_reflex_level TEXT DEFAULT 'medium',
                gag_reflex_notes TEXT DEFAULT '',
                favorite_foods TEXT DEFAULT '["Банан", "Кабачок на пару"]',
                notes TEXT DEFAULT '',
                updated_at TEXT
            )
        ''')
        
        # Ensure user_id column in child_profile
        cursor.execute("PRAGMA table_info(child_profile)")
        cols = [c[1] for c in cursor.fetchall()]
        if 'user_id' not in cols:
            cursor.execute("ALTER TABLE child_profile ADD COLUMN user_id INTEGER DEFAULT 1")
        
        # 3. Meals Tracker Checklist
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                date TEXT NOT NULL,
                meal_type TEXT NOT NULL,
                food_name TEXT NOT NULL,
                texture TEXT NOT NULL,
                chewing_status TEXT NOT NULL,
                gag_occurred INTEGER DEFAULT 0,
                child_reaction TEXT DEFAULT 'happy',
                notes TEXT DEFAULT '',
                created_at TEXT
            )
        ''')
        
        # Ensure user_id column in meals
        cursor.execute("PRAGMA table_info(meals)")
        cols = [c[1] for c in cursor.fetchall()]
        if 'user_id' not in cols:
            cursor.execute("ALTER TABLE meals ADD COLUMN user_id INTEGER DEFAULT 1")
            
        # 4. User Achievements Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                code TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                icon TEXT NOT NULL,
                unlocked INTEGER DEFAULT 0,
                unlocked_at TEXT,
                UNIQUE(user_id, code)
            )
        ''')

        # 5. User Challenge Days Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_challenge_days (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                challenge_name TEXT NOT NULL,
                day_number INTEGER NOT NULL,
                completed INTEGER DEFAULT 0,
                completed_at TEXT,
                UNIQUE(user_id, challenge_name, day_number)
            )
        ''')

        # 6. Forum posts Table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS forum_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                author TEXT NOT NULL,
                avatar TEXT NOT NULL,
                badge TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                tag TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                comments_count INTEGER DEFAULT 0,
                created_at TEXT
            )
        ''')
        
        cursor.execute("PRAGMA table_info(forum_posts)")
        cols = [c[1] for c in cursor.fetchall()]
        if 'user_id' not in cols:
            cursor.execute("ALTER TABLE forum_posts ADD COLUMN user_id INTEGER")

        # 7. Prepopulate Default Demo User (Альбина, Мама Тимофея)
        cursor.execute('SELECT COUNT(*) FROM users')
        if cursor.fetchone()[0] == 0:
            demo_pw_hash = generate_password_hash('demo123')
            cursor.execute('''
                INSERT INTO users (id, email, username, password_hash, created_at)
                VALUES (1, 'demo@zhuimalysh.ru', 'Альбина (Мама Тимофея)', ?, ?)
            ''', (demo_pw_hash, datetime.now().isoformat()))
            
            # Prepopulate child profile for demo user if none exists
            cursor.execute('SELECT COUNT(*) FROM child_profile WHERE user_id = 1')
            if cursor.fetchone()[0] == 0:
                cursor.execute('''
                    INSERT INTO child_profile (user_id, name, birth_date, gender, feeding_stage, teeth_count, allergies, gag_reflex_level, gag_reflex_notes, favorite_foods, notes, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    1,
                    'Тимофей',
                    '2026-02-15',
                    'boy',
                    'stage_4',
                    4,
                    json.dumps(['Коровье молоко (БКМ)', 'Цитрусовые'], ensure_ascii=False),
                    'medium',
                    'Рвотный рефлекс срабатывает на волокна курицы и сухой желток. Мягкие брусочки банана и морковки жует отлично.',
                    json.dumps(['Спелый банан', 'Брокколи на пару', 'Печеное яблочко', 'Кабачок', 'Авокадо'], ensure_ascii=False),
                    'Любит кушать сам руками (finger food). Начинаем активную тренировку бокового жевания.',
                    datetime.now().isoformat()
                ))
            else:
                cursor.execute('UPDATE child_profile SET user_id = 1 WHERE user_id IS NULL')

            # Prepopulate demo meals for demo user
            cursor.execute('UPDATE meals SET user_id = 1 WHERE user_id IS NULL')
            cursor.execute('SELECT COUNT(*) FROM meals WHERE user_id = 1')
            if cursor.fetchone()[0] == 0:
                today = datetime.now()
                demo_meals = [
                    (0, 'breakfast', 'Овсяная каша с кусочками груши', 'soft_pieces', 'self', 0, 'happy', 'С удовольствием зачерпывал и жевал десенками'),
                    (0, 'lunch', 'Крем-суп из брокколи + отварная индейка микро-волокна', 'soft_pieces', 'with_help', 0, 'neutral', 'Половину съел сам ложкой'),
                    (0, 'snack', 'Печеное яблоко ломтиками', 'solid', 'self', 0, 'happy', 'Хрустит и перекладывает язычком на боковые зубки'),
                    (0, 'dinner', 'Паровые кабачки и морковь брусочками', 'finger_food', 'self', 0, 'happy', 'Отличный пинцетный захват!'),

                    (1, 'breakfast', 'Творожок без БКМ с размятым бананом', 'puree', 'self', 0, 'happy', 'Быстро скушал'),
                    (1, 'lunch', 'Паровая тефтелька из индейки размятая вилкой', 'soft_pieces', 'self', 0, 'happy', 'Хорошо жевал боковыми деснами'),
                    (1, 'snack', 'Банан половинкой в кожуре (удобно держать)', 'finger_food', 'self', 0, 'happy', 'Жевал сам пальчиками'),
                    (1, 'dinner', 'Пюре из цветной капусты с кусочками авокадо', 'soft_pieces', 'with_help', 0, 'neutral', 'Авокадо очень понравилось'),

                    (2, 'breakfast', 'Кукурузная кашка с кусочками персика', 'soft_pieces', 'self', 0, 'happy', 'Отлично пережевывал'),
                    (2, 'lunch', 'Суп-пюре из тыквы с микро-кусочками кролика', 'soft_pieces', 'with_help', 1, 'fussy', 'Попал крупный волосок мяса, сработал рвотный рефлекс, откашлялся сам без паники!'),
                    (2, 'snack', 'Огурчик очищенный соломкой (хрустим)', 'solid', 'self', 0, 'happy', 'Массирует десны, тренирует челюсть'),
                    (2, 'dinner', 'Брокколи на пару мягкие соцветия', 'finger_food', 'self', 0, 'happy', 'Любимый продукт')
                ]
                for days_ago, m_type, f_name, f_texture, ch_status, gag, react, nts in demo_meals:
                    m_date = (today - timedelta(days=days_ago)).strftime('%Y-%m-%d')
                    cursor.execute('''
                        INSERT INTO meals (user_id, date, meal_type, food_name, texture, chewing_status, gag_occurred, child_reaction, notes, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (1, m_date, m_type, f_name, f_texture, ch_status, gag, react, nts, datetime.now().isoformat()))

            # Demo achievements
            for code, title, cat, desc, icon in DEFAULT_ACHIEVEMENTS:
                unl = 1 if code in ['first_chew', 'cucumber_master', 'no_puree_week', 'jaw_champion', 'gag_brave'] else 0
                unl_at = '2026-10-25' if unl else None
                cursor.execute('''
                    INSERT OR IGNORE INTO user_achievements (user_id, code, title, category, description, icon, unlocked, unlocked_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (1, code, title, cat, desc, icon, unl, unl_at))

            # Demo challenge days
            for day in range(1, 8):
                cursor.execute('''
                    INSERT OR IGNORE INTO user_challenge_days (user_id, challenge_name, day_number, completed, completed_at)
                    VALUES (?, 'week_no_puree', ?, ?, ?)
                ''', (1, day, 1 if day <= 5 else 0, datetime.now().isoformat() if day <= 5 else None))

        # Prepopulate forum posts if empty
        cursor.execute('SELECT COUNT(*) FROM forum_posts')
        if cursor.fetchone()[0] == 0:
            posts = [
                (
                    'Елена (дочке 8.5 мес)',
                    '👩',
                    'Мама жевателя',
                    'Как мы перестали бояться рвотного рефлекса при кусочках',
                    'Раньше при каждом "кхе" у меня замирало сердце! Спасибо видео-памятке про разницу рвотного рефлекса и удушья. Поняла, что рвотный рефлекс у младенцев расположен близко к кончику языка, и это ИХ ЗАЩИТА. Начали давать брусочки банана и печеного кабачка — дочка сама регулирует темп.',
                    'Рвотный рефлекс',
                    24,
                    8,
                    'Вчера в 14:30'
                ),
                (
                    'Ольга (сыну 10 мес)',
                    '👱‍♀️',
                    'Опытная мама',
                    'Связь жевания с речью: логопед подтвердил прогресс!',
                    'Были на приеме у детского логопеда. Врач сразу обратила внимание на хороший тонус круговой мышцы рта и подвижность языка. Сказала, что отказ от блендера в 7-8 месяцев — лучший вклад в будущее произношение шипящих и буквы Р!',
                    'Прикус и речь',
                    38,
                    12,
                    '2 дня назад'
                ),
                (
                    'Анна (малышу 7 мес)',
                    '👩‍🦰',
                    'Новичок прикорма',
                    'Безопасная нарезка винограда и ягод: делюсь лайфхаком',
                    'Девочки, никогда не давайте круглый виноград и помидорки черри целиком! Только вдоль на 4 части ("лодочками"). В чек-листе нарезки на сайте очень наглядная картинка, распечатала и повесила на холодильник!',
                    'Безопасная нарезка',
                    45,
                    15,
                    '3 дня назад'
                )
            ]
            for author, avatar, badge, title, content, tag, likes, comms, c_at in posts:
                cursor.execute('''
                    INSERT INTO forum_posts (author, avatar, badge, title, content, tag, likes, comments_count, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (author, avatar, badge, title, content, tag, likes, comms, c_at))

        conn.commit()

# Initialize DB on load
init_db()

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Unauthorized', 'message': 'Пожалуйста, войдите в аккаунт или зарегистрируйтесь'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    return render_template('index.html')

# ==================== AUTHENTICATION ENDPOINTS ====================

@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    uid = session.get('user_id')
    if not uid:
        return jsonify({'authenticated': False})
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, email, username, created_at FROM users WHERE id = ?', (uid,))
        user = cursor.fetchone()
        if not user:
            session.pop('user_id', None)
            return jsonify({'authenticated': False})
        
        return jsonify({
            'authenticated': True,
            'user': dict(user)
        })

@app.route('/api/auth/register', methods=['POST'])
def auth_register():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '').strip()
    
    # Child starter info (user fills in during register or can complete in profile)
    child_name = data.get('child_name', '').strip() or 'Малыш'
    child_birth_date = data.get('child_birth_date', '').strip() or datetime.now().strftime('%Y-%m-%d')
    child_gender = data.get('child_gender', 'boy')
    child_stage = data.get('child_stage', 'stage_1')
    
    if not email or '@' not in email or '.' not in email:
        return jsonify({'status': 'error', 'message': 'Укажите корректный адрес электронной почты'}), 400
    if not username:
        return jsonify({'status': 'error', 'message': 'Укажите ваше имя'}), 400
    if len(password) < 4:
        return jsonify({'status': 'error', 'message': 'Пароль должен содержать не менее 4 символов'}), 400
        
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            return jsonify({'status': 'error', 'message': 'Пользователь с таким email уже зарегистрирован'}), 409
            
        hashed_pw = generate_password_hash(password)
        now_str = datetime.now().isoformat()
        cursor.execute('''
            INSERT INTO users (email, username, password_hash, created_at)
            VALUES (?, ?, ?, ?)
        ''', (email, username, hashed_pw, now_str))
        user_id = cursor.lastrowid
        conn.commit()
        
    # Инициализируем чистый профиль, ачивки и челленджи для нового пользователя
    init_user_data(user_id, child_name, child_birth_date, child_gender, child_stage)
    
    session.permanent = True
    session['user_id'] = user_id
    
    return jsonify({
        'status': 'success',
        'message': 'Аккаунт успешно создан!',
        'user': {
            'id': user_id,
            'email': email,
            'username': username
        }
    })

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    
    if not email or not password:
        return jsonify({'status': 'error', 'message': 'Введите email и пароль'}), 400
        
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
        user = cursor.fetchone()
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'status': 'error', 'message': 'Неверный email или пароль'}), 401
            
        user_id = user['id']
        session.permanent = True
        session['user_id'] = user_id
        
        return jsonify({
            'status': 'success',
            'message': 'Добро пожаловать!',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username']
            }
        })

@app.route('/api/auth/demo-login', methods=['POST'])
def auth_demo_login():
    """Быстрый вход в демонстрационный аккаунт с предзаполненными данными."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM users WHERE id = 1')
        user = cursor.fetchone()
        if user:
            session.permanent = True
            session['user_id'] = 1
            return jsonify({
                'status': 'success',
                'user': {
                    'id': user['id'],
                    'email': user['email'],
                    'username': user['username']
                }
            })
    return jsonify({'status': 'error', 'message': 'Демо-аккаунт недоступен'}), 404

@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    session.pop('user_id', None)
    return jsonify({'status': 'success', 'message': 'Вы вышли из системы'})

# ==================== PROFILE ENDPOINTS ====================

@app.route('/api/profile', methods=['GET', 'POST'])
@login_required
def profile_api():
    uid = session['user_id']
    with get_db() as conn:
        cursor = conn.cursor()
        if request.method == 'GET':
            cursor.execute('SELECT * FROM child_profile WHERE user_id = ? LIMIT 1', (uid,))
            row = cursor.fetchone()
            if row:
                profile = dict(row)
                profile['allergies'] = json.loads(profile['allergies'] or '[]')
                profile['favorite_foods'] = json.loads(profile['favorite_foods'] or '[]')
                return jsonify(profile)
            # Возвращаем заготовку, если профиль еще не создан
            return jsonify({
                'name': 'Малыш',
                'birth_date': datetime.now().strftime('%Y-%m-%d'),
                'gender': 'boy',
                'feeding_stage': 'stage_1',
                'teeth_count': 0,
                'allergies': [],
                'gag_reflex_level': 'low',
                'gag_reflex_notes': '',
                'favorite_foods': [],
                'notes': ''
            })
        
        elif request.method == 'POST':
            data = request.json or {}
            cursor.execute('SELECT id FROM child_profile WHERE user_id = ? LIMIT 1', (uid,))
            exists = cursor.fetchone()
            now_str = datetime.now().isoformat()
            allergies_json = json.dumps(data.get('allergies', []), ensure_ascii=False)
            favs_json = json.dumps(data.get('favorite_foods', []), ensure_ascii=False)
            
            if exists:
                cursor.execute('''
                    UPDATE child_profile SET
                        name = ?,
                        birth_date = ?,
                        gender = ?,
                        feeding_stage = ?,
                        teeth_count = ?,
                        allergies = ?,
                        gag_reflex_level = ?,
                        gag_reflex_notes = ?,
                        favorite_foods = ?,
                        notes = ?,
                        updated_at = ?
                    WHERE user_id = ?
                ''', (
                    data.get('name', 'Малыш'),
                    data.get('birth_date', datetime.now().strftime('%Y-%m-%d')),
                    data.get('gender', 'boy'),
                    data.get('feeding_stage', 'stage_1'),
                    int(data.get('teeth_count', 0)),
                    allergies_json,
                    data.get('gag_reflex_level', 'low'),
                    data.get('gag_reflex_notes', ''),
                    favs_json,
                    data.get('notes', ''),
                    now_str,
                    uid
                ))
            else:
                cursor.execute('''
                    INSERT INTO child_profile (user_id, name, birth_date, gender, feeding_stage, teeth_count, allergies, gag_reflex_level, gag_reflex_notes, favorite_foods, notes, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    uid,
                    data.get('name', 'Малыш'),
                    data.get('birth_date', datetime.now().strftime('%Y-%m-%d')),
                    data.get('gender', 'boy'),
                    data.get('feeding_stage', 'stage_1'),
                    int(data.get('teeth_count', 0)),
                    allergies_json,
                    data.get('gag_reflex_level', 'low'),
                    data.get('gag_reflex_notes', ''),
                    favs_json,
                    data.get('notes', ''),
                    now_str
                ))
            conn.commit()
            return jsonify({'status': 'success', 'message': 'Профиль успешно сохранен'})

# ==================== MEALS ENDPOINTS ====================

@app.route('/api/meals', methods=['GET', 'POST'])
@login_required
def meals_api():
    uid = session['user_id']
    with get_db() as conn:
        cursor = conn.cursor()
        if request.method == 'GET':
            date_filter = request.args.get('date')
            if date_filter:
                cursor.execute('SELECT * FROM meals WHERE user_id = ? AND date = ? ORDER BY id ASC', (uid, date_filter))
            else:
                cursor.execute('SELECT * FROM meals WHERE user_id = ? ORDER BY date DESC, id ASC LIMIT 50', (uid,))
            rows = cursor.fetchall()
            return jsonify([dict(r) for r in rows])
        
        elif request.method == 'POST':
            data = request.json or {}
            cursor.execute('''
                INSERT INTO meals (user_id, date, meal_type, food_name, texture, chewing_status, gag_occurred, child_reaction, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                uid,
                data.get('date', datetime.now().strftime('%Y-%m-%d')),
                data.get('meal_type', 'lunch'),
                data.get('food_name', 'Блюдо'),
                data.get('texture', 'soft_pieces'),
                data.get('chewing_status', 'self'),
                int(data.get('gag_occurred', 0)),
                data.get('child_reaction', 'happy'),
                data.get('notes', ''),
                datetime.now().isoformat()
            ))
            conn.commit()
            return jsonify({'status': 'success', 'id': cursor.lastrowid})

@app.route('/api/meals/<int:meal_id>', methods=['DELETE'])
@login_required
def delete_meal(meal_id):
    uid = session['user_id']
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM meals WHERE id = ? AND user_id = ?', (meal_id, uid))
        conn.commit()
        return jsonify({'status': 'success'})

# ==================== ANALYTICS ENDPOINT ====================

@app.route('/api/analytics', methods=['GET'])
@login_required
def analytics_api():
    uid = session['user_id']
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM meals WHERE user_id = ? ORDER BY date ASC', (uid,))
        meals = [dict(r) for r in cursor.fetchall()]

        # Texture distribution
        texture_counts = {'puree': 0, 'soft_pieces': 0, 'solid': 0, 'finger_food': 0}
        # Chewing status
        chewing_counts = {'self': 0, 'with_help': 0, 'refused': 0}
        gag_count = 0

        # Day by day dynamics
        days_map = {}
        for m in meals:
            tex = m['texture']
            if tex in texture_counts:
                texture_counts[tex] += 1
            st = m['chewing_status']
            if st in chewing_counts:
                chewing_counts[st] += 1
            if m.get('gag_occurred'):
                gag_count += 1
            
            d = m['date']
            if d not in days_map:
                days_map[d] = {'date': d, 'self': 0, 'with_help': 0, 'refused': 0, 'total': 0, 'solid_ratio': 0, 'puree_count': 0, 'pieces_count': 0}
            days_map[d]['total'] += 1
            if st in days_map[d]:
                days_map[d][st] += 1
            if tex == 'puree':
                days_map[d]['puree_count'] += 1
            else:
                days_map[d]['pieces_count'] += 1

        for d, v in days_map.items():
            if v['total'] > 0:
                v['solid_ratio'] = round((v['pieces_count'] / v['total']) * 100)

        total_meals = len(meals)
        if total_meals > 0:
            solid_total = texture_counts['soft_pieces'] + texture_counts['solid'] + texture_counts['finger_food']
            solid_percent = round((solid_total / total_meals) * 100)
            self_chew_percent = round((chewing_counts['self'] / total_meals) * 100)
        else:
            solid_percent = 0
            self_chew_percent = 0

        return jsonify({
            'total_meals': total_meals,
            'texture_counts': texture_counts,
            'chewing_counts': chewing_counts,
            'gag_count': gag_count,
            'solid_percent': solid_percent,
            'self_chew_percent': self_chew_percent,
            'daily_dynamics': list(days_map.values())[-14:]
        })

# ==================== ACHIEVEMENTS ENDPOINTS ====================

@app.route('/api/achievements', methods=['GET'])
@login_required
def achievements_api():
    uid = session['user_id']
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM user_achievements WHERE user_id = ? ORDER BY id ASC', (uid,))
        rows = cursor.fetchall()
        return jsonify([dict(r) for r in rows])

@app.route('/api/achievements/unlock', methods=['POST'])
@login_required
def unlock_achievement():
    uid = session['user_id']
    code = (request.json or {}).get('code')
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            UPDATE user_achievements 
            SET unlocked = 1, unlocked_at = ? 
            WHERE user_id = ? AND code = ?
        ''', (datetime.now().strftime('%Y-%m-%d'), uid, code))
        conn.commit()
        return jsonify({'status': 'success'})

# ==================== CHALLENGE "НЕДЕЛЯ БЕЗ ПЮРЕ" ====================

@app.route('/api/challenge', methods=['GET', 'POST'])
@login_required
def challenge_api():
    uid = session['user_id']
    with get_db() as conn:
        cursor = conn.cursor()
        if request.method == 'GET':
            cursor.execute('SELECT * FROM user_challenge_days WHERE user_id = ? AND challenge_name = "week_no_puree" ORDER BY day_number ASC', (uid,))
            return jsonify([dict(r) for r in cursor.fetchall()])
        elif request.method == 'POST':
            day = (request.json or {}).get('day_number')
            completed = (request.json or {}).get('completed', 1)
            cursor.execute('''
                UPDATE user_challenge_days 
                SET completed = ?, completed_at = ? 
                WHERE user_id = ? AND challenge_name = 'week_no_puree' AND day_number = ?
            ''', (completed, datetime.now().isoformat() if completed else None, uid, day))
            conn.commit()
            return jsonify({'status': 'success'})

# ==================== FORUM ENDPOINTS ====================

@app.route('/api/forum', methods=['GET', 'POST'])
def forum_api():
    with get_db() as conn:
        cursor = conn.cursor()
        if request.method == 'GET':
            cursor.execute('SELECT * FROM forum_posts ORDER BY id DESC')
            return jsonify([dict(r) for r in cursor.fetchall()])
        elif request.method == 'POST':
            data = request.json or {}
            uid = session.get('user_id')
            author_name = 'Заботливый родитель'
            
            if uid:
                cursor.execute('SELECT username FROM users WHERE id = ?', (uid,))
                u = cursor.fetchone()
                if u:
                    author_name = u['username']
            if data.get('author') and data.get('author') != 'Заботливый родитель':
                author_name = data.get('author')

            cursor.execute('''
                INSERT INTO forum_posts (user_id, author, avatar, badge, title, content, tag, likes, comments_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
            ''', (
                uid,
                author_name,
                data.get('avatar', '👶'),
                'Родитель жевателя',
                data.get('title', 'Вопрос сообществу'),
                data.get('content', ''),
                data.get('tag', 'Прикорм'),
                'Только что'
            ))
            conn.commit()
            return jsonify({'status': 'success'})

@app.route('/api/forum/like/<int:post_id>', methods=['POST'])
def like_post(post_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('UPDATE forum_posts SET likes = likes + 1 WHERE id = ?', (post_id,))
        conn.commit()
        return jsonify({'status': 'success'})

# ==================== SMART CONSULTATION ENDPOINT ====================

@app.route('/api/specialist-consult', methods=['POST'])
def specialist_consult():
    data = request.json or {}
    role = data.get('role', 'speech_therapist')
    user_query = data.get('query', '').strip()
    query_lower = user_query.lower()
    
    if role == 'speech_therapist':
        if any(w in query_lower for w in ['рвот', 'поперх', 'давит', 'кашл', 'рефлекс', 'страх']):
            response_text = (
                "Здравствуйте! Как детский логопед-дефектолог хочу успокоить вас: рвотный рефлекс (gag reflex) у грудничков — "
                "это физиологический защитный механизм. До 9-10 месяцев его рецепторы находятся на передней и средней трети языка. "
                "Ребенок громко откашливается, выталкивает еду языком вперед и при этом лицо краснеет — это НОРМА, малыш учится контролировать комок пищи!\n\n"
                "💡 Рекомендации логопеда:\n"
                "1. Не хлопайте по спине и не залезайте пальцем в рот (так можно протолкнуть пищу в дыхательные пути).\n"
                "2. Сохраняйте спокойствие: улыбнитесь и покажите ребенку, как откашляться или выплюнуть: 'Кхе-кхе! Выплюнь в ручку!'.\n"
                "3. Для снижения гиперчувствительности делайте массаж десен силиконовым напальчником и давайте твердые прорезыватели с ребрышками."
            )
        elif any(w in query_lower for w in ['прикус', 'зуб', 'челюст', 'уздечк', 'букв', 'звук', 'речь']):
            response_text = (
                "Отличный вопрос! Акт активного жевания — это главный тренажер речи до 1.5 лет:\n\n"
                "1. **Формирование прикуса:** жевание твердой пищи стимулирует рост нижней челюсти и расширение верхнего свода неба. "
                "Если ребенок долго ест только пюре, челюсть остается узкой, и постоянным зубам банально не хватит места (возникает скученность зубов).\n"
                "2. **Подготовка артикуляции:** при жевании кусочков язык двигается не только вперед-назад (как при сосании), "
                "но и совершает боковые движения (латерализация), прижимая еду к молярам и деснам. Именно эти боковые мышцы языка критически нужны для произношения звуков [Р], [Л], [Ш], [Ж].\n\n"
                "💡 Совет: предлагайте безопасные брусочки отварной моркови или запеченного кабачка с обеих сторон рта попеременно!"
            )
        else:
            response_text = (
                f"Спасибо за вопрос! В отношении артикуляционного аппарата и жевательных навыков важно помнить: "
                f"переход от жидкой пищи к кусочкам запускает круговую мышцу рта и смыкание губ. Это также снижает слюнотечение и готовит ребенка к первым связным словам.\n\n"
                f"Продолжайте ежедневные тренировки с кусочками разной плотности, хвалите ребенка за каждую попытку самостоятельного жевания!"
            )
    else:
        if any(w in query_lower for w in ['нарезк', 'как резать', 'размер', 'кусочк', 'подач']):
            response_text = (
                "Здравствуйте! Правильная безопасная подача — залог спокойствия мамы и безопасности малыша:\n\n"
                "🥕 **Морковь и яблоки:** до 1 года сырую круглую морковь или цельное яблоко давать ОПАСНО (риск удушья). "
                "Подавайте морковь отваренной/на пару брусочками размером с ваш указательный палец (она должна легко разминаться между вашими пальцами). Яблоки — запеченные дольками или натертые на мелкой стружке.\n"
                "🍇 **Виноград и черри:** ВСЕГДА режем вдоль на 4 продолговатые дольки! Круглая форма — главный враг дыхательных путей.\n"
                "🍌 **Банан и авокадо:** нарезайте крупными рифлеными брусочками или оставляйте кусочек кожуры снизу для удобного захвата кулачком."
            )
        elif any(w in query_lower for w in ['аллерг', 'сыпь', 'ввод', 'бкм', 'яйц', 'глютен']):
            response_text = (
                "По протоколам доказательной педиатрии (ESPGHAN и Союз педиатров России):\n\n"
                "1. Топ аллергенов (молоко, яйцо, арахис, рыба, соя, пшеница/глютен) вводятся в первой половине дня в микродозе (на кончике ложки).\n"
                "2. Наблюдаем за реакцией (кожа вокруг рта, стул, дыхание, сыпь) в течение 2-3 суток, не вводя другие новые продукты.\n"
                "3. При подтвержденной аллергии на БКМ исключаются все продукты из коровьего молока, но при этом продолжаем расширять овощной и мясной рацион (кролик, индейка, кабачок, брокколи, цветная капуста)."
            )
        else:
            response_text = (
                f"С точки зрения детской нутрициологии: главный ориентир — 'Правило тарелки' и интерес малыша. "
                f"Не стремитесь скормить граммы по таблицам! Важнее обучить механике обработки пищи: "
                f"1) захват рукой -> 2) поднесение ко рту -> 3) откусывание деснами -> 4) смещение на десны -> 5) глотание.\n\n"
                f"Если ребенок устает жевать к середине трапезы, спокойно докормите его или предложите более мягкую консистенцию."
            )
            
    return jsonify({
        'status': 'success',
        'role': role,
        'response': response_text,
        'time': datetime.now().strftime('%H:%M')
    })

# ==================== DOCTOR REPORT EXPORT ====================

@app.route('/api/doctor-report', methods=['GET'])
@login_required
def doctor_report_api():
    uid = session['user_id']
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM child_profile WHERE user_id = ? LIMIT 1', (uid,))
        row = cursor.fetchone()
        profile = dict(row) if row else {'name': 'Малыш', 'birth_date': datetime.now().strftime('%Y-%m-%d'), 'teeth_count': 0, 'allergies': '[]', 'favorite_foods': '[]', 'feeding_stage': 'stage_1'}
        profile['allergies'] = json.loads(profile.get('allergies') or '[]')
        profile['favorite_foods'] = json.loads(profile.get('favorite_foods') or '[]')

        cursor.execute('SELECT * FROM meals WHERE user_id = ? ORDER BY date DESC LIMIT 40', (uid,))
        meals = [dict(r) for r in cursor.fetchall()]

        total = len(meals)
        solid_count = sum(1 for m in meals if m['texture'] in ['soft_pieces', 'solid', 'finger_food'])
        chew_self_count = sum(1 for m in meals if m['chewing_status'] == 'self')
        gag_episodes = sum(1 for m in meals if m.get('gag_occurred'))

        report = {
            'generated_at': datetime.now().strftime('%d.%m.%Y %H:%M'),
            'child': profile,
            'period_summary': {
                'meals_logged': total,
                'solid_food_ratio': f"{round((solid_count / total) * 100)}%" if total > 0 else "0%",
                'self_chewing_ratio': f"{round((chew_self_count / total) * 100)}%" if total > 0 else "0%",
                'gag_episodes_recorded': gag_episodes,
                'bite_development_status': 'Индивидуальный статус: активное развитие жевательного аппарата и переход на твердую пищу'
            },
            'recent_meals': meals[:15]
        }
        return jsonify(report)

if __name__ == '__main__':
    print("Запуск сервера 'Жуй-Малыш' на http://127.0.0.1:5000 ...")
    app.run(host='0.0.0.0', port=5000, debug=True)
