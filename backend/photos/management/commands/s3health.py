from django.core.management.base import BaseCommand
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import boto3, uuid

class Command(BaseCommand):
    help = "Run S3 healthcheck (upload -> head_object -> delete)."

    def handle(self, *args, **options):
        key = f"health/{uuid.uuid4().hex}.txt"
        default_storage.save(key, ContentFile(b"ok"))
        url = default_storage.url(key)

        s3 = boto3.client("s3", region_name="ap-northeast-2")
        s3.head_object(Bucket="timetraveler-prod-images", Key=f"uploads/{key}")
        default_storage.delete(key)

        self.stdout.write(self.style.SUCCESS(f"OK key={key} url={url}"))
