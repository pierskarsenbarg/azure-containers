FROM mcr.microsoft.com/dotnet/sdk:5.0 as builder

WORKDIR /app

COPY app.csproj .

RUN dotnet restore

COPY . .

RUN dotnet publish app.csproj -o /out 

FROM mcr.microsoft.com/dotnet/aspnet:5.0

WORKDIR /app

COPY --from=builder /out /app

EXPOSE 80/tcp

CMD ["dotnet", "app.dll"]