import json
import requests
from nalaf.utils.annotation_readers import AnnJsonAnnotationReader
from nalaf.utils.readers import HTMLReader
from nala.bootstrapping.iteration import Iteration
from nala.bootstrapping.document_filters import ManualStatsDocumentFilter
import shutil
import os
import sys

url = 'https://www.tagtog.net/api/0.1/documents'

assert os.path.exists('../resources/bootstrapping/'), 'You must be in the scrips folder to run this'

try:
    username = sys.argv[1]
    password = sys.argv[2]
    itr_size = int(sys.argv[3])  # For example, 10
except:
    print("You must pass in tagtog username and password, and itr size (nr documents)")
    raise

try:
    pmids = [p.strip() for p in sys.argv[4].split(',')]
    folder = 'test'
except:
    pmids = None
    folder = 'pool'

try:
    itr_number = sys.argv[5]
except:
    itr_number = None

print(username, folder)

def run():
    itr = Iteration(iteration_nr=itr_number)
    print("Running ({}) iteration # : {}".format(folder, itr.number))

    if folder == 'test':
        itr.docselection_pmids(itr_size, pmids)

    else:
        itr.docselection(just_caching=True, nr=500)
        itr.before_annotation(itr_size)

    print('Size to upload: ', len(itr.candidates))

    return itr.number


def upload(n):
    auth = requests.auth.HTTPBasicAuth(username=username, password=password)
    params = {'project': 'nala', 'output': 'null', 'owner': 'jmcejuela', 'folder': folder}
    iter_dir = '../resources/bootstrapping/iteration_{}/candidates'.format(n)

    file = shutil.make_archive(iter_dir, 'zip', iter_dir)
    files = {'files': open(file, 'rb')}

    response = requests.put(url, params=params, auth=auth, files=files)
    if response.status_code == 200:
        for id in response.json()['ids']:
            print('uploaded', id)
            os.rename(os.path.join(os.path.join(iter_dir, 'html'), '{}.html'.format(id.split('-')[-1])),
                      os.path.join(os.path.join(iter_dir, 'html'), '{}.html'.format(id)))

        print("Warnings:", response.json()['warnings'])
        return response.json()['ids']
    else:
        raise Exception(response.status_code, response.text)


def download(n, ids=None):
    cnd_dir = '../resources/bootstrapping/iteration_{}/candidates/html'.format(n)
    if not ids:
        ids = [file.replace('.html', '') for file in os.listdir(cnd_dir)]

    rev_dir = '../resources/bootstrapping/iteration_{}/reviewed'.format(n)
    if not os.path.exists(rev_dir):
        os.makedirs(rev_dir)

    auth = requests.auth.HTTPBasicAuth(username=username, password=password)

    for tagtog_id in ids:
        params = {'project': 'nala', 'output': 'ann.json', 'owner': 'jmcejuela', 'folder': folder,
                  'ids': tagtog_id, 'member': username, 'idType': 'tagtogID'}
        response = requests.get(url, params=params, auth=auth)
        if response.status_code == 200:
            try:
                json.dump(response.json(), open(os.path.join(rev_dir, '{}.ann.json'.format(tagtog_id)), 'w'))
                print('downloaded', tagtog_id)
            except json.JSONDecodeError:
                print('error', tagtog_id, response.status_code, response.text)
        else:
            print('error', tagtog_id, response.status_code, response.text)


def validate(n, ids):
    cnd_dir = '../resources/bootstrapping/iteration_{}/candidates/html'.format(n)
    rev_dir = '../resources/bootstrapping/iteration_{}/reviewed'.format(n)

    data = HTMLReader(cnd_dir).read()
    print(len(data))
    AnnJsonAnnotationReader(rev_dir, delete_incomplete_docs=True).annotate(data)
    print(len(data))

itr_number = run()

ids = upload(itr_number)
print('The following documents are now uploaded to tagtog', ids)
print('Now review them on tagtog')
while True:
    answer = input('Are you done reviewing the documents? ')
    if answer.lower() in ['yes', 'y']:
        break

download(itr_number, ids)
validate(itr_number, ids)
# todo have documents printed out which dont contain any nl mentions or fail to have anncomplete status
print(":-) Congrats for finishing Iteration #", itr_number)
