:

export PATH=$PATH:~/.meteor/tools/latest/bin/

if hash meteor 2>/dev/null; then
        echo "You are cool!  You installed meteor."
else
        curl https://install.meteor.com | /bin/sh
fi

echo "ok, now you can just run meteor."