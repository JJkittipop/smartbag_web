# ใช้ Node.js version 20
FROM node:20-alpine

# สร้างโฟลเดอร์ทำงานใน Container
WORKDIR /app

# ก๊อปปี้ไฟล์ package.json เพื่อติดตั้ง dependencies
COPY package*.json ./
RUN npm install

# ก๊อปปี้โค้ดทั้งหมด (รวมถึงโฟลเดอร์ dist)
COPY . .

RUN npm run build

# เปิดพอร์ต 3000 ตามที่ server.js ใช้
EXPOSE 3000

# สั่งรัน server.js
CMD ["node", "server.js"]
