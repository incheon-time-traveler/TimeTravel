import csv
import os
from django.core.management.base import BaseCommand
from spots.models import Spot


class Command(BaseCommand):
    help = 'Load Incheon spots data from CSV file'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str, help='Path to the CSV file')

    def handle(self, *args, **options):
        csv_file = options['csv_file']
        
        if not os.path.exists(csv_file):
            self.stdout.write(
                self.style.ERROR(f'CSV file not found: {csv_file}')
            )
            return

        # 기존 데이터 삭제 (선택사항)
        Spot.objects.all().delete()
        self.stdout.write('Cleared existing spots data')

        spots_created = 0
        spots_skipped = 0

        with open(csv_file, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)
            
            for row in reader:
                try:
                    # 필수 필드 검증
                    if not row.get('title') or not row.get('mapx') or not row.get('mapy'):
                        spots_skipped += 1
                        continue

                    # Spot 객체 생성
                    spot = Spot(
                        name=row.get('title', ''),
                        description=row.get('overview', ''),
                        address=row.get('addr1', ''),
                        lat=float(row.get('mapy', 0)),
                        lng=float(row.get('mapx', 0)),
                        content_id=row.get('contentid', ''),
                        content_type_id=row.get('contenttypeid', ''),
                        category1=row.get('cat1', ''),
                        category2=row.get('cat2', ''),
                        category3=row.get('cat3', ''),
                        sigungu_code=row.get('sigungucode', ''),
                        use_time=row.get('usetime', ''),
                        first_image=row.get('firstimage', ''),
                        first_image2=row.get('firstimage2', ''),
                        past_image_url=row.get('past_image_url', ''),
                        
                        # Boolean 필드들
                        public_transport=bool(int(row.get('이동_대중교통', 0))),
                        car_transport=bool(int(row.get('이동_자차', 0))),
                        walking_activity=bool(int(row.get('활동_산책', 0))),
                        with_children=bool(int(row.get('동반_아이', 0))),
                        with_pets=bool(int(row.get('동반_반려동물', 0))),
                        clean_facility=bool(int(row.get('청결_시설', 0))),
                        night_view=bool(int(row.get('뷰_야경_경관', 0))),
                        quiet_rest=bool(int(row.get('휴식_조용함', 0))),
                        famous=bool(int(row.get('유명', 0))),
                        experience_info=bool(int(row.get('정보_구성_체험', 0))),
                        fun_sightseeing=bool(int(row.get('볼거리_재미', 0))),
                    )
                    
                    spot.save()
                    spots_created += 1
                    
                    if spots_created % 10 == 0:
                        self.stdout.write(f'Created {spots_created} spots...')
                        
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Error processing row: {e}')
                    )
                    spots_skipped += 1
                    continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {spots_created} spots. Skipped {spots_skipped} spots.'
            )
        ) 