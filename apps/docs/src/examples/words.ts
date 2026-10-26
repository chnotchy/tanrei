// The product's words of the shared examples (`src/examples/<component>/<id>.html`, lib/examples.ts): what a sample
// product says on its buttons, labels and rows, in each language of the docs. An example writes a place,
// `{{words.deleteThreeFiles}}`, and the page fills it in its own language, so the six languages share one markup and
// a translator sees every language of a word on one line.
//
// The keys are the docs' dictionaries' (`en`, `ja`, `zh`, `hi`, `es`, `ar`: a language's primary subtag), and every
// word has all six. These are a sample product's words, not the docs' own (those are `src/lib/i18n.ts`), and never a
// statement about Tanrei.

/** One word of a sample product, in each language of the docs. */
export interface Word {
  en: string;
  ja: string;
  zh: string;
  hi: string;
  es: string;
  ar: string;
}

export const words = {
  // Actions
  cancel: { en: 'Cancel', ja: 'キャンセル', zh: '取消', hi: 'रद्द करें', es: 'Cancelar', ar: 'إلغاء' },
  ok: { en: 'OK', ja: 'OK', zh: '确定', hi: 'ठीक है', es: 'Aceptar', ar: 'موافق' },
  close: { en: 'Close', ja: '閉じる', zh: '关闭', hi: 'बंद करें', es: 'Cerrar', ar: 'إغلاق' },
  save: { en: 'Save', ja: '保存', zh: '保存', hi: 'सेव करें', es: 'Guardar', ar: 'حفظ' },
  saving: { en: 'Saving', ja: '保存中', zh: '正在保存', hi: 'सेव हो रहा है', es: 'Guardando', ar: 'جارٍ الحفظ' },
  saveChanges: { en: 'Save changes', ja: '変更を保存', zh: '保存更改', hi: 'बदलाव सेव करें', es: 'Guardar cambios', ar: 'حفظ التغييرات' },
  saveDraft: { en: 'Save draft', ja: '下書きを保存', zh: '保存草稿', hi: 'ड्राफ़्ट सेव करें', es: 'Guardar borrador', ar: 'حفظ المسودة' },
  preview: { en: 'Preview', ja: 'プレビュー', zh: '预览', hi: 'पूर्वावलोकन', es: 'Vista previa', ar: 'معاينة' },
  publish: { en: 'Publish', ja: '公開', zh: '发布', hi: 'प्रकाशित करें', es: 'Publicar', ar: 'نشر' },
  delete: { en: 'Delete', ja: '削除', zh: '删除', hi: 'हटाएँ', es: 'Eliminar', ar: 'حذف' },
  deleteThreeFiles: { en: 'Delete 3 files', ja: '3 件のファイルを削除', zh: '删除 3 个文件', hi: '3 फ़ाइलें हटाएँ', es: 'Eliminar 3 archivos', ar: 'حذف 3 ملفات' },
  deleteAccount: { en: 'Delete account', ja: 'アカウントを削除', zh: '删除账号', hi: 'खाता हटाएँ', es: 'Eliminar cuenta', ar: 'حذف الحساب' },
  deleteAccountEllipsis: { en: 'Delete account…', ja: 'アカウントの削除…', zh: '删除账号…', hi: 'खाता हटाएँ…', es: 'Eliminar cuenta…', ar: 'حذف الحساب…' },
  rename: { en: 'Rename', ja: '名前を変更', zh: '重命名', hi: 'नाम बदलें', es: 'Cambiar nombre', ar: 'إعادة تسمية' },
  duplicate: { en: 'Duplicate', ja: '複製', zh: '创建副本', hi: 'प्रतिलिपि बनाएँ', es: 'Duplicar', ar: 'تكرار' },
  share: { en: 'Share', ja: '共有', zh: '共享', hi: 'शेयर करें', es: 'Compartir', ar: 'مشاركة' },
  moveTo: { en: 'Move to', ja: '移動', zh: '移至', hi: 'यहाँ ले जाएँ', es: 'Mover a', ar: 'نقل إلى' },
  archive: { en: 'Archive', ja: 'アーカイブ', zh: '归档', hi: 'आर्काइव', es: 'Archivados', ar: 'الأرشيف' },
  export: { en: 'Export', ja: 'エクスポート', zh: '导出', hi: 'निर्यात करें', es: 'Exportar', ar: 'تصدير' },
  compose: { en: 'Compose', ja: '作成', zh: '写邮件', hi: 'लिखें', es: 'Redactar', ar: 'إنشاء رسالة' },
  signOut: { en: 'Sign out', ja: 'ログアウト', zh: '退出登录', hi: 'साइन आउट करें', es: 'Cerrar sesión', ar: 'تسجيل الخروج' },

  // Fields
  emailAddress: { en: 'Email address', ja: 'メールアドレス', zh: '电子邮件地址', hi: 'ईमेल पता', es: 'Correo electrónico', ar: 'البريد الإلكتروني' },
  receiptHint: { en: 'We send the receipt here.', ja: '領収書をこのアドレスに送ります。', zh: '收据将发送到此地址。', hi: 'रसीद इसी पते पर भेजी जाएगी।', es: 'Te enviaremos el recibo aquí.', ar: 'سنرسل الإيصال إلى هذا العنوان.' },
  projectName: { en: 'Project name', ja: 'プロジェクト名', zh: '项目名称', hi: 'प्रोजेक्ट का नाम', es: 'Nombre del proyecto', ar: 'اسم المشروع' },
  projectNameHint: { en: 'Shown to everyone in the team.', ja: 'チームの全員に表示されます。', zh: '团队中的所有人都能看到。', hi: 'टीम के सभी लोगों को दिखेगा।', es: 'Lo verá todo el equipo.', ar: 'يظهر لكل أعضاء الفريق.' },
  fullName: { en: 'Full name', ja: '氏名', zh: '姓名', hi: 'पूरा नाम', es: 'Nombre completo', ar: 'الاسم الكامل' },
  fullNameRequired: { en: 'Full name (required)', ja: '氏名（必須）', zh: '姓名（必填）', hi: 'पूरा नाम (ज़रूरी)', es: 'Nombre completo (obligatorio)', ar: 'الاسم الكامل (مطلوب)' },
  required: { en: 'Required', ja: '必須', zh: '必填', hi: 'ज़रूरी', es: 'Obligatorio', ar: 'مطلوب' },
  invoiceNumber: { en: 'Invoice number', ja: '請求書番号', zh: '发票号码', hi: 'इनवॉइस नंबर', es: 'Número de factura', ar: 'رقم الفاتورة' },

  // Menus
  sortBy: { en: 'Sort by', ja: '並べ替え', zh: '排序方式', hi: 'इसके अनुसार सॉर्ट करें', es: 'Ordenar por', ar: 'الترتيب حسب' },
  name: { en: 'Name', ja: '名前', zh: '名称', hi: 'नाम', es: 'Nombre', ar: 'الاسم' },
  dateModified: { en: 'Date modified', ja: '更新日', zh: '修改日期', hi: 'बदलाव की तारीख', es: 'Fecha de modificación', ar: 'تاريخ التعديل' },
  size: { en: 'Size', ja: 'サイズ', zh: '大小', hi: 'आकार', es: 'Tamaño', ar: 'الحجم' },

  // Tabs
  account: { en: 'Account', ja: 'アカウント', zh: '账号', hi: 'खाता', es: 'Cuenta', ar: 'الحساب' },
  overview: { en: 'Overview', ja: '概要', zh: '概览', hi: 'सारांश', es: 'Resumen', ar: 'نظرة عامة' },
  overviewLong: { en: 'Overview of your account', ja: 'アカウントの概要と最近の利用状況', zh: '账号概览与最近的使用情况', hi: 'आपके खाते का सारांश', es: 'Resumen de tu cuenta', ar: 'نظرة عامة على حسابك' },
  billing: { en: 'Billing', ja: '請求', zh: '账单', hi: 'बिलिंग', es: 'Facturación', ar: 'الفوترة' },
  billingLong: { en: 'Billing and invoices', ja: '請求とお支払いの履歴', zh: '账单与付款记录', hi: 'बिलिंग और इनवॉइस', es: 'Facturación y facturas', ar: 'الفوترة والفواتير' },
  members: { en: 'Members', ja: 'メンバー', zh: '成员', hi: 'सदस्य', es: 'Miembros', ar: 'الأعضاء' },
  membersLong: { en: 'Members and permissions', ja: 'メンバーとアクセス権限', zh: '成员与访问权限', hi: 'सदस्य और अनुमतियाँ', es: 'Miembros y permisos', ar: 'الأعضاء والأذونات' },
  library: { en: 'Library', ja: 'ライブラリ', zh: '媒体库', hi: 'लाइब्रेरी', es: 'Biblioteca', ar: 'المكتبة' },
  photos: { en: 'Photos', ja: '写真', zh: '照片', hi: 'फ़ोटो', es: 'Fotos', ar: 'الصور' },
  videos: { en: 'Videos', ja: '動画', zh: '视频', hi: 'वीडियो', es: 'Vídeos', ar: 'الفيديوهات' },
  music: { en: 'Music', ja: '音楽', zh: '音乐', hi: 'संगीत', es: 'Música', ar: 'الموسيقى' },
  project: { en: 'Project', ja: 'プロジェクト', zh: '项目', hi: 'प्रोजेक्ट', es: 'Proyecto', ar: 'المشروع' },
  activity: { en: 'Activity', ja: 'アクティビティ', zh: '动态', hi: 'गतिविधि', es: 'Actividad', ar: 'النشاط' },
  files: { en: 'Files', ja: 'ファイル', zh: '文件', hi: 'फ़ाइलें', es: 'Archivos', ar: 'الملفات' },
  all: { en: 'All', ja: 'すべて', zh: '全部', hi: 'सभी', es: 'Todo', ar: 'الكل' },
  comments: { en: 'Comments', ja: 'コメント', zh: '评论', hi: 'टिप्पणियाँ', es: 'Comentarios', ar: 'التعليقات' },
  changes: { en: 'Changes', ja: '変更', zh: '更改', hi: 'बदलाव', es: 'Cambios', ar: 'التغييرات' },
  view: { en: 'View', ja: '表示', zh: '视图', hi: 'दृश्य', es: 'Vista', ar: 'طريقة العرض' },
  grid: { en: 'Grid', ja: 'グリッド', zh: '网格', hi: 'ग्रिड', es: 'Cuadrícula', ar: 'شبكة' },
  list: { en: 'List', ja: 'リスト', zh: '列表', hi: 'सूची', es: 'Lista', ar: 'قائمة' },
  map: { en: 'Map', ja: '地図', zh: '地图', hi: 'नक्शा', es: 'Mapa', ar: 'خريطة' },

  // Sliders and switches
  brightness: { en: 'Brightness', ja: '明るさ', zh: '亮度', hi: 'चमक', es: 'Brillo', ar: 'السطوع' },
  autoBrightness: { en: 'Automatic brightness', ja: '明るさの自動調節', zh: '自动调节亮度', hi: 'अपने-आप चमक', es: 'Brillo automático', ar: 'السطوع التلقائي' },
  delay: { en: 'Delay before sending', ja: '送信までの待ち時間', zh: '发送前等待', hi: 'भेजने से पहले रुकें', es: 'Espera antes de enviar', ar: 'المهلة قبل الإرسال' },
  fourSeconds: { en: '4 s', ja: '4 秒', zh: '4 秒', hi: '4 सेकंड', es: '4 s', ar: '4 ث' },
  volume: { en: 'Volume', ja: '音量', zh: '音量', hi: 'आवाज़', es: 'Volumen', ar: 'مستوى الصوت' },

  // Navigation
  mail: { en: 'Mail', ja: 'メール', zh: '邮件', hi: 'मेल', es: 'Correo', ar: 'البريد' },
  inbox: { en: 'Inbox', ja: '受信トレイ', zh: '收件箱', hi: 'इनबॉक्स', es: 'Recibidos', ar: 'الوارد' },
  starred: { en: 'Starred', ja: 'スター付き', zh: '已加星标', hi: 'तारांकित', es: 'Destacados', ar: 'المميَّزة بنجمة' },
  sent: { en: 'Sent', ja: '送信済み', zh: '已发送', hi: 'भेजे गए', es: 'Enviados', ar: 'المرسَل' },
  drafts: { en: 'Drafts', ja: '下書き', zh: '草稿', hi: 'ड्राफ़्ट', es: 'Borradores', ar: 'المسودات' },
  trash: { en: 'Trash', ja: 'ゴミ箱', zh: '回收站', hi: 'ट्रैश', es: 'Papelera', ar: 'المهملات' },
  spam: { en: 'Spam', ja: '迷惑メール', zh: '垃圾邮件', hi: 'स्पैम', es: 'Spam', ar: 'الرسائل غير المرغوب فيها' },
  labels: { en: 'Labels', ja: 'ラベル', zh: '标签', hi: 'लेबल', es: 'Etiquetas', ar: 'التصنيفات' },
  work: { en: 'Work', ja: '仕事', zh: '工作', hi: 'काम', es: 'Trabajo', ar: 'العمل' },
  family: { en: 'Family', ja: '家族', zh: '家人', hi: 'परिवार', es: 'Familia', ar: 'العائلة' },
  workspace: { en: 'Workspace', ja: 'ワークスペース', zh: '工作区', hi: 'वर्कस्पेस', es: 'Espacio de trabajo', ar: 'مساحة العمل' },
  projects: { en: 'Projects', ja: 'プロジェクト', zh: '项目', hi: 'प्रोजेक्ट', es: 'Proyectos', ar: 'المشاريع' },
  admin: { en: 'Admin', ja: '管理', zh: '管理', hi: 'एडमिन', es: 'Administración', ar: 'الإدارة' },
  general: { en: 'General', ja: '一般', zh: '常规', hi: 'सामान्य', es: 'General', ar: 'عام' },
  more: { en: 'More', ja: 'その他', zh: '更多', hi: 'और', es: 'Más', ar: 'المزيد' },
} satisfies Record<string, Word>;

/** The key of a word, as an example writes it after `words.`. */
export type WordKey = keyof typeof words;
