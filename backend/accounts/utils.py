from dotenv import load_dotenv
from django.shortcuts import redirect
import os
import requests

# .env 파일 로드하기
load_dotenv()

# access 토큰 받는 함수
def get_access_token(code):
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
        "redirect_uri": "http://127.0.0.1:8000/accounts/google/callback/",
        "grant_type": "authorization_code",
    }
    response = requests.post(token_url, data=data)
    token_data = response.json()
    access_token = token_data.get("access_token")
    return access_token


def get_user_info(access_token):
    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
    userinfo_response = requests.get(
        userinfo_url,
        headers={"Authorization": f"Bearer {access_token}"}
    )
    userinfo = userinfo_response.json()
    email = userinfo.get("email")
    name = userinfo.get("name")
    nickname = ""
    if not email:
        return redirect("/")
    
    return email, name, nickname


def get_kakao_user_info(access_token):
    user_info_url = "https://kapi.kakao.com/v2/user/me"
    headers = {"Authorization": f"Bearer {access_token}"}
    user_response = requests.get(user_info_url, headers=headers)
    user_info = user_response.json()
    kakao_id = user_info.get("id")
    kakao_account = user_info.get("kakao_account", {})
    email = kakao_account.get("email", f"{kakao_id}@kakao.com")
    name = kakao_account.get("profile", {}).get("nickname", "kakao_user")
    nickname = ""
    
    return email, name, nickname