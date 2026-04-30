FROM maven:3.9.9-eclipse-temurin-17 AS app-builder
WORKDIR /build
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests clean package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-chi-sim tesseract-ocr-eng ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY tools/pdfcpu/pdfcpu /usr/local/bin/pdfcpu
COPY --from=app-builder /build/target/wechat-tools-backend-1.0.0.jar /app/app.jar

RUN chmod +x /usr/local/bin/pdfcpu \
    && mkdir -p /app/storage /app/logs

EXPOSE 8080
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar /app/app.jar"]
