import { tr } from './i18n';

/** Codes the database functions raise (architecture, section 20), in both languages. */
const MESSAGES: Record<string, [uz: string, ru: string]> = {
  forbidden: ["Ruxsat yo'q", 'Нет доступа'],
  note_required: ['Sababni yozing', 'Укажите причину'],
  name_required: ['Nomini kiriting', 'Укажите название'],
  invalid_quantity: ["Soni 1 dan 10 000 gacha bo'lishi kerak", 'Количество должно быть от 1 до 10 000'],
  invalid_tag_type: ["Metka turi noto'g'ri", 'Неверный тип метки'],
  invalid_passports: ["Pasportlar soni noto'g'ri", 'Неверное количество паспортов'],
  invalid_price: ["Narx noto'g'ri", 'Неверная цена'],
  invalid_amount: ["Summa noto'g'ri", 'Неверная сумма'],
  invalid_type: ["Tur noto'g'ri", 'Неверный тип'],
  invalid_slug: ['Manzil faqat lotin harflari, raqamlar va chiziqchadan iborat', 'Адрес: только латинские буквы, цифры и дефис'],
  slug_taken: ['Bu manzil band', 'Этот адрес уже занят'],
  store_not_found: ["Do'kon topilmadi", 'Магазин не найден'],
  store_not_found_or_blocked: ["Do'kon topilmadi yoki bloklangan", 'Магазин не найден или заблокирован'],
  store_not_active: ["Do'kon faol emas", 'Магазин не активен'],
  batch_not_found: ['Partiya topilmadi', 'Партия не найдена'],
  batch_already_sold: ['Partiya allaqachon sotilgan', 'Партия уже продана'],
  batch_empty: ["Partiyada sotiladigan metka yo'q", 'В партии нет меток для продажи'],
  insufficient_passports: ['Pasport balansi yetarli emas', 'Недостаточно паспортов на балансе'],
  tag_not_found: ['Metka topilmadi', 'Метка не найдена'],
  passport_not_found: ['Pasport topilmadi', 'Паспорт не найден'],
  passport_not_active: ['Pasport faol emas', 'Паспорт не активен'],
  passport_not_blocked: ['Pasport bloklanmagan', 'Паспорт не заблокирован'],
  passport_not_correctable: ["Bu pasportda raqamni o'zgartirib bo'lmaydi", 'В этом паспорте нельзя изменить номер'],
  invalid_phone: ["Telefon raqami noto'g'ri", 'Неверный номер телефона'],
  client_name_required: ['Mijoz ismini kiriting', 'Укажите имя клиента'],
  client_not_found: ['Mijoz topilmadi', 'Клиент не найден'],
  query_too_short: ['Kamida 3 ta belgi kiriting', 'Введите не меньше 3 символов'],
  invalid_status: ["Holat noto'g'ri", 'Неверный статус'],
  invalid_role: ["Rol noto'g'ri", 'Неверная роль'],
  member_not_found: ['Xodim topilmadi', 'Сотрудник не найден'],
  last_owner: ["Do'konda kamida bitta faol egasi qolishi kerak", 'В магазине должен остаться хотя бы один активный владелец'],
  branch_not_found: ['Filial topilmadi', 'Точка не найдена'],
  category_not_found: ['Kategoriya topilmadi', 'Категория не найдена'],
  brand_not_found: ['Brend topilmadi', 'Бренд не найден'],
  invalid_problem_key: ['Kalit faqat lotin harflari, raqamlar va _ dan iborat', 'Ключ: только латинские буквы, цифры и _'],
  problem_type_not_found: ['Muammo turi topilmadi', 'Тип проблемы не найден'],
  brands_name_unique: ['Bunday brend bor', 'Такой бренд уже есть'],
  problem_types_unique: ['Bunday kalit bor', 'Такой ключ уже есть'],
  // Activation and corrections of a passport.
  scan_expired: ['Skanerlash muddati tugadi, metkani qayta skanerlang', 'Время скана истекло, отсканируйте метку ещё раз'],
  tag_not_activatable: ['Bu metkani faollashtirib bo\'lmaydi', 'Эту метку нельзя активировать'],
  invalid_passport_data: ['Brend, model va nomini kiriting', 'Укажите бренд, модель и название'],
  image_required: ['Texnika rasmini qo\'shing', 'Добавьте фото техники'],
  invalid_image: ['Rasmni saqlab bo\'lmadi', 'Не удалось сохранить фото'],
  banner_not_found: ['Banner topilmadi', 'Баннер не найден'],
  invalid_link: ["Havola / bilan yoki https:// bilan boshlanishi kerak", 'Ссылка должна начинаться с / или https://'],
  bot_not_configured: ["Telegram bot ulanmagan: Botlar → «Botlarni ulash»", 'Telegram-бот не подключён: «Боты» → «Подключить ботов»'],
  webhook_secret_missing: ["Supabase sirlarida YS_TG_WEBHOOK_SECRET yo'q", 'В секретах Supabase нет YS_TG_WEBHOOK_SECRET'],
  invalid_location: ['Lokatsiya kengligi va uzunligi bilan kiritiladi, masalan: 41.311081, 69.240562', 'Локация вводится как широта и долгота, например: 41.311081, 69.240562'],
  branches_location_check: ['Lokatsiya kengligi va uzunligi bilan kiritiladi, masalan: 41.311081, 69.240562', 'Локация вводится как широта и долгота, например: 41.311081, 69.240562'],
  invalid_period: ["Tugash sanasi boshlanishidan keyin bo'lishi kerak", 'Конец показа должен быть позже начала'],
  invalid_warranty_provider: ['Kafolat kimda ekanini tanlang', 'Выберите, кто даёт гарантию'],
  invalid_warranty: ['Kafolat muddati xarid sanasidan oldin bo\'lmasligi kerak', 'Срок гарантии не может быть раньше покупки'],
  invalid_purchase_date: ['Xarid sanasi kelajakda bo\'lmasligi kerak', 'Дата покупки не может быть в будущем'],
  serial_required: ['Seriya raqamini kiriting', 'Укажите серийный номер'],
  correction_window_passed: ['24 soat o\'tdi: endi tuzatish mumkin emas', 'Прошло 24 часа: исправить уже нельзя'],
  passport_not_voidable: ['Mijoz ulagan pasportni bekor qilib bo\'lmaydi', 'Паспорт, подключённый клиентом, отменить нельзя'],
  passport_not_returnable: ['Bu pasportni qaytarib bo\'lmaydi', 'Этот паспорт нельзя вернуть'],
  passport_not_claimable: ['Pasport allaqachon ulangan', 'Паспорт уже подключён'],
  // Catalog.
  product_image_required: ['Avval rasm qo\'shing', 'Сначала добавьте фото'],
  product_not_found: ['Mahsulot topilmadi', 'Товар не найден'],
  model_required: ['Modelni kiriting', 'Укажите модель'],
  // Customers, requests and orders.
  search_required: ['Mijozni topish uchun kamida 3 ta belgi kiriting', 'Чтобы найти клиента, введите не меньше 3 символов'],
  customer_not_found: ['Mijoz topilmadi', 'Клиент не найден'],
  request_not_found: ['Ariza topilmadi', 'Заявка не найдена'],
  one_assignee_required: ['Usta yoki servis markazini tanlang', 'Выберите мастера или сервисный центр'],
  assignee_not_found: ['Ijrochi topilmadi', 'Исполнитель не найден'],
  provider_not_found: ['Servis markazi topilmadi', 'Сервисный центр не найден'],
  order_not_found: ['Buyurtma topilmadi', 'Заказ не найден'],
  invalid_status_change: ['Bu holatga o\'tkazib bo\'lmaydi', 'Перевести в этот статус нельзя'],
  // The client's app.
  invalid_cart: ['Savatni tekshiring', 'Проверьте корзину'],
  product_unavailable: ['Savatdagi mahsulot sotuvda qolmadi', 'Товара из корзины больше нет в продаже'],
  too_many_open_orders: ['Ochiq buyurtmalar juda ko\'p. Avvalgilari yakunlanishini kuting', 'Слишком много открытых заказов. Дождитесь завершения прежних'],
  invalid_request_type: ['Ariza turi noto\'g\'ri', 'Неверный тип заявки'],
  invalid_problem_type: ['Muammo turini tanlang', 'Выберите тип проблемы'],
  description_required: ['Muammoni qisqacha yozing', 'Коротко опишите проблему'],
  description_too_long: ['Matn juda uzun', 'Слишком длинный текст'],
  too_many_requests: ['Bugun arizalar juda ko\'p. Ertaga urinib ko\'ring', 'Сегодня слишком много заявок. Попробуйте завтра'],
  request_already_open: ['Bu muammo bo\'yicha ariza allaqachon ochiq', 'Заявка по этой проблеме уже открыта'],
  invalid_rating: ['Bahoni tanlang', 'Выберите оценку'],
  invalid_language: ['Til noto\'g\'ri', 'Неверный язык'],
  // create-staff
  invalid_login: ['Login: 3–32 ta lotin harfi, raqam, nuqta, chiziqcha', 'Логин: 3–32 латинские буквы, цифры, точка, дефис'],
  weak_password: ['Parol kamida 8 ta belgi', 'Пароль не короче 8 символов'],
  login_taken: ['Bu login band', 'Этот логин уже занят'],
  create_failed: ['Xodimni yaratib bo\'lmadi', 'Не удалось создать сотрудника'],
  // The database's own limits (20261107010000_text_limits): the name of the limit ends the message.
  '_length"': ['Matn juda uzun', 'Слишком длинный текст'],
  labels_count: ["Belgilar juda ko'p", 'Слишком много меток'],
};

// A lost connection says so, whatever the browser calls it.
const OFFLINE = /Failed to fetch|NetworkError|Load failed|network request failed|ERR_INTERNET|ERR_NETWORK/i;
// What only the database or the server would say: never shown as it is.
const TECHNICAL = /violates|relation "|column "|constraint|syntax|permission denied|function |JWT|PGRST|postgres|internal_error|duplicate key|null value/i;

// Longest first: client_name_required also contains name_required.
const CODES = Object.keys(MESSAGES).sort((a, b) => b.length - a.length);

export function errorMessage(error: unknown): string {
  const raw = error as { message?: string; details?: string } | null | undefined;
  const text = `${raw?.message ?? ''} ${raw?.details ?? ''}`;
  for (const code of CODES) {
    if (text.includes(code)) return tr(MESSAGES[code][0], MESSAGES[code][1]);
  }
  if (OFFLINE.test(text)) return tr("Internet aloqasi yo'q. Qayta urinib ko'ring", 'Нет соединения. Попробуйте ещё раз');
  if (!raw?.message || TECHNICAL.test(text)) return tr('Xatolik yuz berdi', 'Произошла ошибка');
  return raw.message;
}
