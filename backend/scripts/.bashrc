# ~/.bashrc: Được thực thi bởi bash(1) cho các shell không đăng nhập.

# ═══════════════════════════════════════════════════════════════════
# ⚙️ 1. CẤU HÌNH CƠ BẢN & MÔI TRƯỜNG
# ═══════════════════════════════════════════════════════════════════

[ -z "$PS1" ] && return

# Lịch sử dòng lệnh
HISTCONTROL=ignoredups:ignorespace
shopt -s histappend
HISTSIZE=10000
HISTFILESIZE=20000

# Tiện ích Bash
shopt -s checkwinsize
shopt -s cdspell
[ -x /usr/bin/lesspipe ] && eval "$(SHELL=/bin/sh lesspipe)"

if [ -z "$debian_chroot" ] && [ -r /etc/debian_chroot ]; then
    debian_chroot=$(cat /etc/debian_chroot)
fi

# Hoàn thành phím tab
if [ -f /etc/bash_completion ] && ! shopt -oq posix; then
    . /etc/bash_completion
fi

# Khai báo đường dẫn
. "$HOME/.cargo/env"
export PATH="$HOME/myenv/bin:$HOME/.local/bin:$PATH"

# Bảng màu nâng cao (Dùng chung cho Prompt và Dashboard)
export GREEN='\033[0;32m'
export LGREEN='\033[1;32m'
export CYAN='\033[0;36m'
export LCYAN='\033[1;36m'
export YELLOW='\033[1;33m'
export RED='\033[0;31m'
export LRED='\033[1;31m'
export MAGENTA='\033[0;35m'
export LMAGENTA='\033[1;35m'
export BLUE='\033[0;34m'
export LBLUE='\033[1;34m'
export WHITE='\033[1;37m'
export GRAY='\033[0;90m'
export NC='\033[0m' # No Color

# Bật màu cho ls, grep
if [ -x /usr/bin/dircolors ]; then
    test -r ~/.dircolors && eval "$(dircolors -b ~/.dircolors)" || eval "$(dircolors -b)"
    alias ls='ls --color=auto'
    alias grep='grep --color=auto'
    alias fgrep='fgrep --color=auto'
    alias egrep='egrep --color=auto'
fi

# ═══════════════════════════════════════════════════════════════════
# 🎨 2. TÙY CHỈNH DẤU NHẮC LỆNH (PROMPT) VỚI GIT
# ═══════════════════════════════════════════════════════════════════

# Đặt tiêu đề cho terminal
case "$TERM" in
    xterm*|rxvt*) PS1="\[\e]0;${debian_chroot:+($debian_chroot)}\u@\h: \w\a\]" ;;
    *) PS1="" ;;
esac

parse_git_branch() {
    git branch 2>/dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/ (\1)/'
}

# Áp dụng Prompt
PS1+="${debian_chroot:+($debian_chroot)}\[\033[01;32m\]\u\[\033[00m\]@\[\033[01;34m\]\h\[\033[00m\]:\[\033[01;33m\]\w\[\033[01;35m\]\$(parse_git_branch)\[\033[00m\]\$ "

# ═══════════════════════════════════════════════════════════════════
# ⌨️ 3. ALIASES (PHÍM TẮT DÒNG LỆNH)
# ═══════════════════════════════════════════════════════════════════

# Lệnh ls nhanh
alias ll='ls -alF'
alias la='ls -A'
alias l='ls -CF'

# Di chuyển thư mục
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias .....='cd ../../../..'

# Quản lý hệ thống & Công cụ
alias c='clear'
alias sysup='apt update && apt upgrade -y && echo -e "✅ Cập nhật hoàn tất!"'
alias clean='apt autoremove -y && apt clean && rm -rf ~/.cache/* && echo -e "✅ Đã dọn dẹp rác hệ thống!"'
alias top5='ps -eo pcpu,pid,user,args | sort -k 1 -r | head -6'
alias editbash='nano ~/.bashrc'
alias bashrc='source ~/.bashrc'
alias thoitiet='curl -s "wttr.in/Phu+Quoc?m1"'

# Alias Dự án
alias myenv='cd ~ && source myenv/bin/activate'
alias deploy='python3 /mnt/sdcard/ubuntu-backend-core/scripts/deploy.py'
alias track='python3 /mnt/sdcard/ubuntu-backend-core/scripts/tracks.py'

# Chỉ chạy backend (26868)
alias backendv1='bash /mnt/sdcard/ubuntu-backend-core/scripts/auto_start.sh'
# Chạy backend-frontend chung port 26868
alias maychuv2='python3 /mnt/sdcard/ubuntu-backend-core/start_all.py'

# Máy chủ chạy độc lập
alias frontend='bash /mnt/sdcard/d4mdev/run_frontend.sh'     # Port 3000
alias backend='bash /mnt/sdcard/d4mdev/run_backend.sh'       # Port 16868
alias maychuv3='bash /mnt/sdcard/d4mdev/d4m_start_all.sh' # Chạy cả 2 Frontend-Backend

# Phím tắt điều khiển máy chủ dự án nhanh
alias server='restartserver'
alias stopserver='stopcore'

# Git Alias
alias gs='git status'
alias gc='git commit'
alias gca='git commit -a'
alias gp='git push'
alias gpl='git pull'
alias gd='git diff'
alias gl='git log --oneline -10'
alias ga='git add'
alias gaa='git add --all'
alias gb='git branch'
alias gco='git checkout'
alias gcb='git checkout -b'

# Nhập alias phụ nếu có
[ -f ~/.bash_aliases ] && . ~/.bash_aliases

# ═══════════════════════════════════════════════════════════════════
# 🛠️ 4. HÀM TIỆN ÍCH (FUNCTIONS)
# ═══════════════════════════════════════════════════════════════════

mkcd() { mkdir -p "$1" && cd "$1"; }
findf() { find . -type f -name "*$1*" 2>/dev/null; }
findd() { find . -type d -name "*$1*" 2>/dev/null; }

# Hàm giải nén vạn năng
extract() {
    if [ -f "$1" ] ; then
        case "$1" in
            *.tar.bz2)   tar xjf "$1"     ;;
            *.tar.gz)    tar xzf "$1"     ;;
            *.bz2)       bunzip2 "$1"     ;;
            *.rar)       unrar e "$1"     ;;
            *.gz)        gunzip "$1"      ;;
            *.tar)       tar xf "$1"      ;;
            *.tbz2)      tar xjf "$1"     ;;
            *.tgz)       tar xzf "$1"     ;;
            *.zip)       unzip "$1"       ;;
            *.Z)         uncompress "$1"  ;;
            *.7z)        7z x "$1"        ;;
            *)           echo "'$1' không hỗ trợ giải nén qua hàm này." ;;
        esac
    else
        echo "'$1' không phải là một file hợp lệ."
    fi
}

# ═══════════════════════════════════════════════════════════════════
# 🛑 5. QUẢN LÝ SERVICES & PORT
# ═══════════════════════════════════════════════════════════════════

stopcode() {
    if pgrep -f "code-server" > /dev/null 2>&1; then
        pkill -f "code-server"
        echo -e " ${GREEN}✅ Đã dừng code-server${NC}"
    else
        echo -e " ${YELLOW}⚠️ Code-server không chạy${NC}"
    fi
}

stopserver() {
    # Kiểm tra PID chạy trên port 16868 để kill chính xác
    local pid=$(netstat -tlnp 2>/dev/null | grep ':16868' | awk '{print $7}' | cut -d'/' -f1)
    if [ -n "$pid" ]; then
        kill -9 $pid
        echo -e " ${GREEN}✅ Đã dừng máy chủ dự án (Port 16868)${NC}"
    elif pgrep -f "start_all.py" > /dev/null 2>&1 || pgrep -f "server.py" > /dev/null 2>&1; then
        pkill -f "start_all.py"
        pkill -f "server.py"
        echo -e " ${GREEN}✅ Đã dừng tiến trình máy chủ liên quan${NC}"
    else
        echo -e " ${YELLOW}⚠️ Máy chủ (Port 16868) không chạy${NC}"
    fi
}

restartcode() {
    stopcode
    sleep 1
    echo -e " ${YELLOW}🚀 Đang khởi động lại code-server...${NC}"
    nohup code-server --bind-addr 0.0.0.0:8080 --auth none > /dev/null 2>&1 &
    sleep 2
    echo -e " ${GREEN}✅ Đã khởi động lại code-server!${NC}"
    echo -e " ${CYAN}➜${NC} ${WHITE}Localhost${NC}: ${CYAN}http://127.0.0.1:8080${NC}"
}

restartserver() {
    stopserver
    sleep 1
    echo -e " ${YELLOW}🚀 Đang khởi động lại máy chủ dự án (Port 16868)...${NC}"
    # Mặc định gọi file máy chủ của bạn, chỉnh lại đường dẫn nếu bạn muốn gọi trực tiếp start_all.py
    nohup python3 /storage/emulated/0/coder/media/server.py > /dev/null 2>&1 &
    sleep 2
    echo -e " ${GREEN}✅ Đã khởi động lại máy chủ dự án!${NC}"
    echo -e " ${CYAN}➜${NC} ${WHITE}Localhost${NC}: ${CYAN}http://127.0.0.1:16868${NC}"
}

portcheck() {
    echo -e "\n ${WHITE}╭──────────────────────────────────────────────────────────────╮${NC}"
    echo -e " ${WHITE}│${NC} ${LMAGENTA}📡 KIỂM TRA PORT ĐANG DÙNG${NC}"
    echo -e " ${WHITE}╰──────────────────────────────────────────────────────────────╯${NC}\n"
    
    echo -e " ${CYAN}Port 8080 (code-server):${NC}"
    if netstat -tlnp 2>/dev/null | grep ':8080' > /dev/null; then
        netstat -tlnp 2>/dev/null | grep ':8080' | while read line; do echo -e " ${GREEN}●${NC} $line"; done
    else
        echo -e " ${GRAY}○ Không có process${NC}"
    fi
    
    echo -e "\n ${CYAN}Port 16868 (Máy chủ Core):${NC}"
    if netstat -tlnp 2>/dev/null | grep ':16868' > /dev/null; then
        netstat -tlnp 2>/dev/null | grep ':16868' | while read line; do echo -e " ${GREEN}●${NC} $line"; done
    else
        echo -e " ${GRAY}○ Không có process${NC}"
    fi
    echo -e ""
}

run() {
    if pgrep -f "code-server" > /dev/null 2>&1; then
        echo -e "\n ${GREEN}╭────────────────────────────────────────────────────────────╮${NC}"
        echo -e " ${GREEN}│${NC} ${WHITE}✅ CODE-SERVER ĐÃ CHẠY${NC}"
        echo -e " ${GREEN}│${NC} ${CYAN}➜${NC} ${WHITE}Localhost${NC}: ${CYAN}http://127.0.0.1:8080${NC}"
        [ -n "$IP_WAN" ] && echo -e " ${GREEN}│${NC} ${CYAN}➜${NC} ${WHITE}WiFi IP${NC}: ${CYAN}http://${IP_WAN}:8080${NC}"
        echo -e " ${GREEN}╰────────────────────────────────────────────────────────────╯${NC}\n"
    else
        echo -e "\n ${YELLOW}🚀 Đang khởi động code-server...${NC}\n"
        code-server --bind-addr 0.0.0.0:8080 --auth none
    fi
}

# ═══════════════════════════════════════════════════════════════════
# 🚀 6. DASHBOARD TERMINAL & KHỞI ĐỘNG TỰ ĐỘNG
# ═══════════════════════════════════════════════════════════════════

# Lấy thông tin mạng & thiết bị
termux-wake-lock 2>/dev/null
IP_LOCAL="127.0.0.1"
IP_WAN=$(ifconfig 2>/dev/null | awk '/inet / && !/127.0.0.1/ && !/172.16./ {print $2}' | head -1)
[ -z "$IP_WAN" ] && IP_WAN=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$IP_WAN" ] && IP_WAN="${GRAY}Không xác định${NC}"

# Hàm lấy thông tin pin
get_battery_info() {
    if [ -f /sys/class/power_supply/battery/capacity ]; then
        BATTERY_LEVEL=$(cat /sys/class/power_supply/battery/capacity 2>/dev/null)
        BATTERY_STATUS=$(cat /sys/class/power_supply/battery/status 2>/dev/null)
        if [ "$BATTERY_STATUS" = "Charging" ]; then
            echo -e "${GREEN}⚡ ${BATTERY_LEVEL}%${NC}"
        elif [ "$BATTERY_LEVEL" -le 20 ]; then
            echo -e "${RED}🪫 ${BATTERY_LEVEL}%${NC}"
        elif [ "$BATTERY_LEVEL" -le 50 ]; then
            echo -e "${YELLOW}🔋 ${BATTERY_LEVEL}%${NC}"
        else
            echo -e "${GREEN}🔋 ${BATTERY_LEVEL}%${NC}"
        fi
    else
        echo -e "${GRAY}🔌 N/A${NC}"
    fi
}

# Cấu hình Dashboard
DATETIME=$(date '+%H:%M:%S 📅 %d/%m/%Y')
DEVICE=$(getprop ro.product.model 2>/dev/null || echo "Unknown")
ANDROID_VER=$(getprop ro.build.version.release 2>/dev/null || echo "Unknown")
RAM_USAGE=$(free -h | awk '/Mem:/ {print $3 "/" $2}' 2>/dev/null || echo "Unknown")
CPU_LOAD=$(cat /proc/loadavg | awk '{print $1}' 2>/dev/null || echo "Unknown")
DISK_AVAIL=$(df -h /data | awk 'NR==2 {print $4}' 2>/dev/null || echo "Unknown")
BATTERY_INFO=$(get_battery_info)

GRADIENT_START='\033[38;5;39m'
GRADIENT_MID='\033[38;5;123m'
GRADIENT_END='\033[38;5;207m'

# Kiểm tra trạng thái CODE SERVER (Port 8080)
if pgrep -f "code-server" > /dev/null 2>&1; then
    CODE_STATUS="${GREEN}● ONLINE${NC}"
    CODE_URL="${CYAN}http://127.0.0.1:8080${NC} ${GRAY}hoặc${NC} ${CYAN}http://${IP_WAN}:8080${NC}"
else
    CODE_STATUS="${GRAY}○ OFFLINE${NC}"
    CODE_URL="${GRAY}Chạy 'run' để khởi động${NC}"
fi

# Kiểm tra trạng thái MÁY CHỦ CORE (Port 16868)
if netstat -tlnp 2>/dev/null | grep -q ':16868'; then
    CORE_STATUS="${GREEN}● ONLINE${NC}"
    CORE_URL="${CYAN}http://127.0.0.1:16868${NC} ${GRAY}hoặc${NC} ${CYAN}http://${IP_WAN}:16868${NC}"
else
    CORE_STATUS="${GRAY}○ OFFLINE${NC}"
    CORE_URL="${GRAY}Chạy 'backend' để khởi động${NC}"
fi

# ═══════════════════════════════════════════════════════════════════
# 🎨 LOGO ASCII ART VỚI HIỆU ỨNG ĐẸP (GỌN NHẸ CHO TERMUX/MOBILE)
# ═══════════════════════════════════════════════════════════════════

echo -e ""
echo -e " ${GRADIENT_START}╭────────────────────────────────────╮${NC}"
echo -e " ${GRADIENT_MID}│${NC} ${LMAGENTA}⚡${NC} ${WHITE}WELCOME TO${NC} ${LCYAN}TERMINAL PRO${NC} ${WHITE}CORE${NC} ${LMAGENTA}⚡${NC} ${GRADIENT_MID}│${NC}"
echo -e " ${GRADIENT_END}╰────────────────────────────────────╯${NC}"
echo -e ""
echo -e "    ${LRED}█▀▄ █▄█ █▀▄▀█ ${GRAY}▪ ${LCYAN}█▀▄ █▀▀ █░█${NC}"
echo -e "    ${LRED}█░█ ░▀█ █░▀░█ ${GRAY}▪ ${LCYAN}█░█ ██▄ ▀▄▀${NC}"
echo -e "    ${LRED}▀▀░ ░░▀ ▀░░░▀ ${GRAY}▪ ${LCYAN}▀▀░ ▀▀▀ ░▀░${NC}"
echo -e ""
echo -e "    ${WHITE}👤 System Operator:${NC} ${CYAN}D4M-DEV${NC}"
echo -e ""

# In bảng thống kê
echo -e " ${WHITE}╭──────────────────────────────────────────────────────────────╮${NC}"
echo -e " ${WHITE}│${NC} ${LMAGENTA}🖥️${NC} ${WHITE}THIẾT BỊ${NC} : ${CYAN}${DEVICE}${NC} (Android ${ANDROID_VER})"
echo -e " ${WHITE}│${NC} ${LMAGENTA}🔋${NC} ${WHITE}PIN${NC}      : ${BATTERY_INFO}"
echo -e " ${WHITE}│${NC} ${LMAGENTA}🏠${NC} ${WHITE}LAN/WIFI${NC} : ${YELLOW}${IP_LOCAL}${NC} / ${YELLOW}${IP_WAN}${NC}"
echo -e " ${WHITE}│${NC} ${LMAGENTA}💾${NC} ${WHITE}RAM/CPU${NC}  : ${CYAN}${RAM_USAGE}${NC} - Load: ${CYAN}${CPU_LOAD}${NC}"
echo -e " ${WHITE}│${NC} ${LMAGENTA}💽${NC} ${WHITE}DISK FREE${NC}: ${CYAN}${DISK_AVAIL}${NC}"
echo -e " ${WHITE}│${NC} ${LMAGENTA}⏰${NC} ${WHITE}THỜI GIAN${NC}: ${WHITE}${DATETIME}${NC}"
echo -e " ${WHITE}├──────────────────────────────────────────────────────────────┤${NC}"
echo -e " ${WHITE}│${NC} ${GREEN}📦${NC} ${WHITE}CODE SERVER${NC} : ${CODE_STATUS}"
echo -e " ${WHITE}│${NC} ${CYAN}➜${NC} ${WHITE}URL${NC}: ${CODE_URL}"
echo -e " ${WHITE}│${NC} ${YELLOW}🚀${NC} ${WHITE}MÁY CHỦ CORE${NC}: ${CORE_STATUS}"
echo -e " ${WHITE}│${NC} ${CYAN}➜${NC} ${WHITE}URL${NC}: ${CORE_URL}"
echo -e " ${WHITE}╰──────────────────────────────────────────────────────────────╯${NC}\n"

# Tự động khởi động code-server ngầm nếu chưa chạy
if ! pgrep -f "code-server" > /dev/null 2>&1; then
    echo -e " ${YELLOW}🚀 Đang tự động khởi động code-server...${NC}"
    nohup code-server --bind-addr 0.0.0.0:8080 --auth none > /dev/null 2>&1 &
    sleep 1
    echo -e " ${GREEN}✅ Đã khởi động! Gõ 'run' để xem địa chỉ truy cập.${NC}\n"
fi
