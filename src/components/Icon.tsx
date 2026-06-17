// 軽量インラインSVGアイコン（外部ライブラリ不使用）
type IconName =
  | 'dashboard'
  | 'entry'
  | 'sheets'
  | 'projects'
  | 'masters'
  | 'reports'
  | 'admin'
  | 'logout'
  | 'plus'
  | 'trash'
  | 'edit'
  | 'check'
  | 'print'
  | 'download'
  | 'upload'
  | 'copy'
  | 'close'
  | 'search'
  | 'chevron'
  | 'truck'
  | 'yen'
  | 'send'

const PATHS: Record<IconName, string> = {
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  entry: 'M4 21h4l11-11-4-4L4 17v4zM21 6.4 17.6 3 16 4.6 19.4 8 21 6.4z',
  sheets: 'M4 4h16v3H4V4zm0 6h16v3H4v-3zm0 6h16v3H4v-3z',
  projects: 'M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z',
  masters: 'M19.4 13a7.8 7.8 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1l-.4-2.6h-3.8l-.4 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.8 7.8 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.4 2.6h3.8l.4-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z',
  reports: 'M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm6 1.5V8h4.5L13 3.5zM9 13h6v1.5H9V13zm0 3h6v1.5H9V16z',
  admin: 'M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3zm0 6a2.5 2.5 0 0 1 1 4.8V15a1 1 0 0 1-2 0v-2.2A2.5 2.5 0 0 1 12 8z',
  logout: 'M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z',
  trash: 'M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2z',
  edit: 'M4 21h4l11-11-4-4L4 17v4zM21 6.4 17.6 3 16 4.6 19.4 8 21 6.4z',
  check: 'M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z',
  print: 'M6 9V3h12v6h3v8h-4v4H7v-4H3V9h3zm2-4v4h8V5H8zm0 11v4h8v-6H8v2zm-2-3h12',
  download: 'M5 20h14v-2H5v2zM12 3v10l4-4 1.4 1.4L12 16 6.6 10.4 8 9l4 4V3h0z',
  upload: 'M5 20h14v-2H5v2zM12 16V6l4 4 1.4-1.4L12 3 6.6 8.6 8 10l4-4v10h0z',
  copy: 'M16 1H4a2 2 0 0 0-2 2v12h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 16H8V7h11v14z',
  close: 'M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12 19 6.4z',
  search: 'M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.5-1.5-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z',
  chevron: 'M8.6 16.6 13.2 12 8.6 7.4 10 6l6 6-6 6-1.4-1.4z',
  truck: 'M3 4h11v9H3V4zm12 3h4l3 3v3h-7V7zM6.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  yen: 'M12 3 7 11h3v2H7v2h3v4h4v-4h3v-2h-3v-2h3l-5-8z',
  send: 'M2 21l21-9L2 3v7l15 2-15 2v7z',
}

interface IconProps {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
