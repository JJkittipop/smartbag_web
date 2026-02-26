# ใช้ Node.js version 20
FROM node:20-alpine

# สร้างโฟลเดอร์ทำงานใน Container
WORKDIR /app


COPY package*.json ./
RUN npm install


COPY . .

RUN npm run build

# เปิดพอร์ต 3000 ตามที่ server.js ใช้
EXPOSE 3000

# สั่งรัน server.js
CMD ["node", "server.js"]
